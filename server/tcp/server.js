const net = require("net");
const packetRouter = require("./packetRouter");

const TCP_PORT = process.env.TCP_PORT || 6000;

// ─────────────────────────────────────────────
// TCP SERVER
// ─────────────────────────────────────────────

const server = net.createServer((socket) => {
  console.log(
    `📡 Device connected from ${socket.remoteAddress}:${socket.remotePort}`,
  );

  // 🔹 Every socket gets its own buffer
  socket.buffer = "";

  // 🔹 Socket level configs (industry standard)
  socket.setKeepAlive(true, 60000); // keep alive every 60s
  socket.setTimeout(300000); // 5 min idle timeout
  socket.setNoDelay(true);

  // ─────────────────────────────────────────
  // DATA EVENT
  // ─────────────────────────────────────────
  socket.on("data", async (data) => {
    try {
      // Convert buffer → string
      const incoming = data.toString("utf8");

      // Append to existing buffer
      socket.buffer += incoming;

      /**
       * AIS devices usually end packets with:
       * \n  or  \r\n  or  *
       * We will safely split on newline
       */
      const packets = socket.buffer.split(/\r?\n/);

      // Last packet may be incomplete → keep it
      socket.buffer = packets.pop();

      for (const rawPacket of packets) {
        const packet = rawPacket.trim();

        if (!packet) continue;

        await packetRouter(socket, packet);
      }
    } catch (err) {
      console.error("❌ Error processing data:", err.message);
    }
  });

  // ─────────────────────────────────────────
  // SOCKET CLOSE
  // ─────────────────────────────────────────
  socket.on("close", () => {
    console.log(
      `📴 Device disconnected ${socket.imei ? `IMEI: ${socket.imei}` : ""}`,
    );
  });

  // ─────────────────────────────────────────
  // SOCKET TIMEOUT
  // ─────────────────────────────────────────
  socket.on("timeout", () => {
    console.warn("⏱️ Socket timeout, closing connection");
    socket.end();
  });

  // ─────────────────────────────────────────
  // SOCKET ERROR
  // ─────────────────────────────────────────
  socket.on("error", (err) => {
    console.error("❌ Socket error:", err.message);
  });
});

// ─────────────────────────────────────────────
// SERVER ERROR
// ─────────────────────────────────────────────
server.on("error", (err) => {
  console.error("❌ TCP Server error:", err.message);
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
server.listen(TCP_PORT, () => {
  console.log(`🚀 TCP AIS Server running on port ${TCP_PORT}`);
});

module.exports = server;
