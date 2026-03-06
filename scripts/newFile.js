
const net = require("net");

const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = Number(process.env.TCP_PORT || 6000);

const IMEI = "098765432198798";
const VEHICLE = "PB-20-9876";
const route = [
  // Sector 17 Start
  { lat: 30.7415, lng: 76.7680, speed: 25, heading: 0 },

  { lat: 30.7422, lng: 76.7682, speed: 28, heading: 5 },

  { lat: 30.7430, lng: 76.7685, speed: 30, heading: 8 },

  // slight right turn Sector 22
  { lat: 30.7438, lng: 76.7695, speed: 22, heading: 35 },

  { lat: 30.7445, lng: 76.7708, speed: 24, heading: 50 },

  // traffic stop
  { lat: 30.7445, lng: 76.7708, speed: 0, heading: 50 },

  { lat: 30.7445, lng: 76.7708, speed: 0, heading: 50 },

  // move again
  { lat: 30.7452, lng: 76.7720, speed: 35, heading: 65 },

  { lat: 30.7460, lng: 76.7732, speed: 38, heading: 75 },

  // overspeed short burst
  { lat: 30.7470, lng: 76.7745, speed: 82, heading: 85 },

  { lat: 30.7480, lng: 76.7758, speed: 88, heading: 90 },

  // harsh brake
  { lat: 30.7485, lng: 76.7762, speed: 18, heading: 95 },

  // left turn Sector 35
  { lat: 30.7490, lng: 76.7760, speed: 20, heading: 130 },

  { lat: 30.7500, lng: 76.7752, speed: 24, heading: 160 },

  // idle near signal
  { lat: 30.7505, lng: 76.7750, speed: 0, heading: 170 },

  { lat: 30.7505, lng: 76.7750, speed: 0, heading: 170 },

  // move Sector 43
  { lat: 30.7515, lng: 76.7745, speed: 32, heading: 180 },

  { lat: 30.7525, lng: 76.7740, speed: 34, heading: 185 },

  // final stop
  { lat: 30.7532, lng: 76.7738, speed: 0, heading: 190, ignition: 0 },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loginPacket() {
  return `$LGN,${IMEI},${new Date().toISOString()}`;
}

function nrmPacket(point) {
  const ignition = point.ignition !== undefined ? point.ignition : 1;

  return `$NRM,${IMEI},${point.lat},${point.lng},${point.speed},${point.heading},${ignition},${new Date().toISOString()}`;
}

function overspeedPacket(speed) {
  return `$ALT,${IMEI},OVERSPEED,${speed},${new Date().toISOString()}`;
}

function harshBrakePacket() {
  return `$ALT,${IMEI},HARSH_BRAKE,${new Date().toISOString()}`;
}

async function run(socket) {
  socket.write(loginPacket() + "\n");

  await delay(3000);

  for (let i = 0; i < route.length; i++) {
    const point = route[i];

    if (point.speed > 80) {
      socket.write(overspeedPacket(point.speed) + "\n");
    }

    if (i > 0 && route[i - 1].speed > 80 && point.speed < 25) {
      socket.write(harshBrakePacket() + "\n");
    }

    socket.write(nrmPacket(point) + "\n");

    console.log(
      `Sent: ${point.lat}, ${point.lng}, speed=${point.speed}`,
    );

    await delay(5000);
  }

  socket.end();
}

const client = net.createConnection({ host: HOST, port: PORT }, async () => {
  console.log("Connected");
  await run(client);
});

client.on("data", (data) => {
  console.log("ACK:", data.toString());
});

client.on("error", console.error);