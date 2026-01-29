const net = require("net");
const mongoose = require("mongoose");

const GpsDevice = require("../Modules/gpsDevice/model");
const VehicleDeviceMapping = require("../Modules/vehicleMapping/model");
const Service = require("../Modules/gpsLiveData/service");

/**
 * AIS-140 TCP GPS Server
 * --------------------------------
 * Responsibilities:
 * - Accept TCP connections
 * - Authenticate devices via IMEI
 * - Track online/offline status
 * - Parse & process AIS-140 packets
 * - Maintain active socket map
 * - Send ACK / commands
 */

class TcpGpsServer {
  constructor(port = 8800) {
    this.port = port;
    this.server = null;

    this.activeConnections = new Map(); // imei -> socket
    this.bufferMap = new Map(); // socket -> buffer
    this.packetCounter = new Map(); // imei -> count
    this.connectionTime = new Map(); // imei -> Date
  }

  /* -------------------------------------------------------------------------- */
  /*                               SERVER START                                 */
  /* -------------------------------------------------------------------------- */

  start() {
    this.server = net.createServer((socket) => this.handleConnection(socket));

    this.server.listen(this.port, () => {
      console.log(`✅ AIS-140 TCP Server running on port ${this.port}`);
    });

    this.server.on("error", (err) => {
      console.error("❌ TCP Server Error:", err);
    });

    setInterval(() => this.logStatus(), 300000); // 5 min
  }

  /* -------------------------------------------------------------------------- */
  /*                            CONNECTION HANDLING                              */
  /* -------------------------------------------------------------------------- */

  handleConnection(socket) {
    const client = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n📡 New connection: ${client}`);

    this.bufferMap.set(socket, "");

    socket.setTimeout(300000);
    socket.setKeepAlive(true, 60000);
    socket.setNoDelay(true);

    socket.on("data", (data) => this.handleData(socket, data));
    socket.on("close", () => this.handleDisconnect(socket));
    socket.on("timeout", () => socket.end());
    socket.on("error", (err) =>
      console.error(
        `❌ Socket error (${socket.deviceIMEI || client})`,
        err.message,
      ),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               DATA HANDLING                                 */
  /* -------------------------------------------------------------------------- */

  async handleData(socket, data) {
    const incoming = data.toString("utf8");

    let buffer = this.bufferMap.get(socket) + incoming;
    const packets = buffer.split(/\r?\n/);
    this.bufferMap.set(socket, packets.pop() || "");

    for (const pkt of packets) {
      const packet = pkt.trim();
      if (packet) {
        await this.processPacket(socket, packet);
      }
    }
  }

  async processPacket(socket, packet) {
    console.log(
      `📦 PACKET [${socket.deviceIMEI || "unauth"}]: ${packet.slice(0, 120)}`,
    );

    if (this.isLoginPacket(packet)) {
      return this.handleLogin(socket, packet);
    }

    if (this.isHeartbeat(packet)) {
      return this.handleHeartbeat(socket);
    }

    if (this.isGpsPacket(packet)) {
      return this.handleGpsData(socket, packet);
    }

    console.log("⚠️ Unknown packet:", packet);
  }

  /* -------------------------------------------------------------------------- */
  /*                                PACKET TYPES                                 */
  /* -------------------------------------------------------------------------- */

  isLoginPacket(packet) {
    return (
      packet.includes("imei:") ||
      packet.startsWith("##") ||
      packet.startsWith("$$") ||
      packet.startsWith("*HQ")
    );
  }

  isHeartbeat(packet) {
    return (
      packet.startsWith("$HB") ||
      packet.startsWith("$HA") ||
      packet.startsWith("$HP") ||
      packet.includes("heartbeat")
    );
  }

  isGpsPacket(packet) {
    return (
      packet.startsWith("$NR") ||
      packet.startsWith("$EA") ||
      packet.startsWith("$IN") ||
      packet.startsWith("$IF") ||
      packet.startsWith("$TA") ||
      packet.startsWith("$BD") ||
      packet.startsWith("$BR") ||
      packet.startsWith("$BL")
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                LOGIN FLOW                                   */
  /* -------------------------------------------------------------------------- */

  async handleLogin(socket, packet) {
    try {
      const imei = this.extractIMEI(packet);

      if (!imei) {
        socket.write("DENY\n");
        return socket.end();
      }

      const device = await GpsDevice.findOne({ imei });
      if (!device || device.status !== "active") {
        socket.write("DENY\n");
        return socket.end();
      }

      socket.deviceIMEI = imei;
      socket.organizationId = device.organizationId;

      this.activeConnections.set(imei, socket);
      this.connectionTime.set(imei, new Date());
      this.packetCounter.set(imei, 0);

      await GpsDevice.updateOne(
        { imei },
        {
          $set: {
            isOnline: true,
            lastLoginTime: new Date(),
            lastSeen: new Date(),
          },
        },
      );

      console.log(`✅ Device authenticated: ${imei}`);
      socket.write("ON\n"); // AIS-140 safe ACK
    } catch (err) {
      console.error("❌ Login error:", err);
      socket.write("ERROR\n");
    }
  }

  extractIMEI(packet) {
    let match = packet.match(/imei:(\d{15})/i);
    if (match) return match[1];

    match = packet.match(/\*HQ,(\d{15})/);
    if (match) return match[1];

    match = packet.match(/\d{15}/);
    if (match) return match[0];

    return null;
  }

  /* -------------------------------------------------------------------------- */
  /*                              HEARTBEAT FLOW                                 */
  /* -------------------------------------------------------------------------- */

  async handleHeartbeat(socket) {
    if (!socket.deviceIMEI) return;

    await GpsDevice.updateOne(
      { imei: socket.deviceIMEI },
      { $set: { lastSeen: new Date() } },
    );

    socket.write("OK\n");
  }

  /* -------------------------------------------------------------------------- */
  /*                               GPS DATA FLOW                                 */
  /* -------------------------------------------------------------------------- */

  async handleGpsData(socket, packet) {
    const imei = socket.deviceIMEI;
    if (!imei) return;

    // ensure device is mapped
    const device = await GpsDevice.findOne({ imei }).select("_id");
    if (!device) {
      console.log(`⚠️ Ignoring GPS data (device not found): ${imei}`);
      return;
    }

    // ensure device is mapped
    const mapping = await VehicleDeviceMapping.findOne({
      gpsDeviceId: device._id,
      unassignedAt: null,
    });

    if (!mapping) {
      console.log(`⚠️ Ignoring GPS data (device not mapped): ${imei}`);
      return;
    }

    const controller = require("../Modules/gpsLiveData/controller");

    let parsed;
    try {
      parsed = controller.AIS140PacketParser.parsePacket(packet);
    } catch (e) {
      console.error("❌ Packet parse failed:", e.message);
      return;
    }

    parsed.imei = parsed.imei || imei;

    const count = (this.packetCounter.get(imei) || 0) + 1;
    this.packetCounter.set(imei, count);

    await GpsDevice.updateOne({ imei }, { $set: { lastSeen: new Date() } });

    const result = await Service.processGpsData({
      ...parsed,
      imei,
      organizationId: socket.organizationId,
    });

    if (result?.success) {
      await controller.storeFullPacketData(parsed);
      socket.write("ACK\n");
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              DISCONNECT FLOW                                */
  /* -------------------------------------------------------------------------- */

  async handleDisconnect(socket) {
    const imei = socket.deviceIMEI;

    if (imei) {
      console.log(`📴 Device disconnected: ${imei}`);

      await GpsDevice.updateOne(
        { imei },
        { $set: { isOnline: false, lastSeen: new Date() } },
      );

      this.activeConnections.delete(imei);
      this.packetCounter.delete(imei);
      this.connectionTime.delete(imei);
    }

    this.bufferMap.delete(socket);
  }

  /* -------------------------------------------------------------------------- */
  /*                               COMMAND APIs                                  */
  /* -------------------------------------------------------------------------- */

  sendCommandToDevice(imei, command) {
    const socket = this.activeConnections.get(imei);
    if (socket && !socket.destroyed) {
      socket.write(command + "\n");
      return { success: true };
    }
    return { success: false, message: "Device not connected" };
  }

  broadcastCommand(command) {
    let sent = 0;
    for (const socket of this.activeConnections.values()) {
      if (!socket.destroyed) {
        socket.write(command + "\n");
        sent++;
      }
    }
    return { success: true, sent };
  }

  /* -------------------------------------------------------------------------- */
  /*                                STATUS / STATS                               */
  /* -------------------------------------------------------------------------- */

  logStatus() {
    console.log("\n📊 TCP SERVER STATUS");
    console.log(`   Active Devices: ${this.activeConnections.size}`);
    this.activeConnections.forEach((_, imei) => {
      console.log(`   • ${imei}`);
    });
    console.log("────────────────────────────\n");
  }

  getStatistics() {
    const stats = [];
    this.activeConnections.forEach((_, imei) => {
      stats.push({
        imei,
        packets: this.packetCounter.get(imei) || 0,
        connectedSince: this.connectionTime.get(imei),
      });
    });
    return {
      port: this.port,
      activeConnections: this.activeConnections.size,
      devices: stats,
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                                SHUTDOWN                                     */
  /* -------------------------------------------------------------------------- */

  async stop() {
    console.log("🛑 Stopping TCP server...");
    for (const socket of this.activeConnections.values()) {
      socket.end();
    }
    this.activeConnections.clear();
    this.bufferMap.clear();
    if (this.server) {
      this.server.close();
    }
  }
}

const tcpServer = new TcpGpsServer(process.env.TCP_PORT || 8800);
module.exports = tcpServer;
