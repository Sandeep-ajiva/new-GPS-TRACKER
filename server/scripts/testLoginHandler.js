const net = require("net");

const TCP_HOST = "127.0.0.1";
const TCP_PORT = 6000; // same as server

// 🔴 REAL DB DATA
const IMEI = "123456789012345";
const VEHICLE_NO = "TS09ER1234";
const SOFTWARE_VERSION = "2.5AIS";

// 🔐 EXACT LOGIN PACKET FOR YOUR HANDLER
const loginPacket = `$LGN,${VEHICLE_NO},${IMEI},${SOFTWARE_VERSION}\n`;

console.log("🚀 Sending Login Packet:");
console.log(loginPacket);

const client = new net.Socket();

client.connect(TCP_PORT, TCP_HOST, () => {
  console.log("✅ Connected to TCP Server");
  client.write(loginPacket);
});

client.on("data", (data) => {
  console.log("📩 Server Response:", data.toString());
});

client.on("close", () => {
  console.log("🔌 Connection closed");
});

client.on("error", (err) => {
  console.error("❌ TCP Error:", err.message);
});
