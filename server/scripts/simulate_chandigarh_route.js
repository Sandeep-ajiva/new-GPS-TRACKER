const net = require('net');

// Configuration via env or CLI
const HOST = process.env.TCP_HOST || '127.0.0.1';
const PORT = parseInt(process.env.TCP_PORT || '6000', 10);
const IMEI = process.env.IMEI || process.argv[2] || 'TESTIMEI123456';
const ORG_ID = process.env.ORG_ID || process.argv[3] || null;
const VEHICLE_ID = process.env.VEHICLE_ID || process.argv[4] || null;
const GPS_DEVICE_ID = process.env.GPS_DEVICE_ID || process.argv[5] || null;
const INTERVAL_MS = 3000;

if (!ORG_ID || !VEHICLE_ID || !GPS_DEVICE_ID) {
  console.error('Usage: node simulate_chandigarh_route.js <imei?> <organizationId> <vehicleId> <gpsDeviceId>');
  process.exit(1);
}

// A simple Chandigarh route (city center → sector sequence). Use these real-ish coordinates to simulate movement.
const route = [
  { lat: 30.7333, lng: 76.7794 }, // near Sector 17 / city center
  { lat: 30.7350, lng: 76.7860 }, // moving east
  { lat: 30.7370, lng: 76.7920 }, // towards Sukhna Lake area
  { lat: 30.7400, lng: 76.7980 },
  { lat: 30.7430, lng: 76.8030 }
];

function haversineKm(a, b){
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat/2), sinDLon = Math.sin(dLon/2);
  const c = 2 * Math.asin(Math.sqrt(sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon));
  return R * c;
}

const client = new net.Socket();
client.setEncoding('utf8');

client.connect(PORT, HOST, () => {
  console.log(`Connected to TCP ${HOST}:${PORT}`);

  let idx = 0;
  let prev = route[0];

  const sendPacket = () => {
    const point = route[idx % route.length];
    const distKm = haversineKm(prev, point);
    const speedKph = Math.min(60, Math.max(10, Math.round(distKm / (INTERVAL_MS/1000/3600) )));

    const packet = {
      imei: IMEI,
      organizationId: ORG_ID,
      vehicleId: VEHICLE_ID,
      gpsDeviceId: GPS_DEVICE_ID,
      latitude: point.lat,
      longitude: point.lng,
      currentSpeed: speedKph,
      ignitionStatus: true,
      engineStatus: true,
      movementStatus: speedKph > 0 ? 'moving' : 'stopped',
      batteryLevel: 85,
      signalStrength: 4,
      temperature: '34C',
      timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(packet);
    console.log('Sending packet:', json);
    client.write(json + '\n');

    prev = point;
    idx++;
  };

  sendPacket();
  const timer = setInterval(sendPacket, INTERVAL_MS);

  const cleanup = () => { clearInterval(timer); client.end(); process.exit(0); };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});

client.on('error', (err) => { console.error('TCP client error:', err && err.message ? err.message : err); process.exit(2); });
