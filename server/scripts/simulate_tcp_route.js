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
  console.error('Usage: node simulate_tcp_route.js <imei?> <organizationId> <vehicleId> <gpsDeviceId>');
  console.error('Or set env IMEI, ORG_ID, VEHICLE_ID, GPS_DEVICE_ID');
  process.exit(1);
}

// Provided Bangalore route (use as-is)
const route = [
  { lat: 12.9715987, lng: 77.594566 },
  { lat: 12.972210,  lng: 77.599932 },
  { lat: 12.973145,  lng: 77.606879 },
  { lat: 12.974210,  lng: 77.613745 },
  { lat: 12.975480,  lng: 77.620350 }
];

// utility: simple distance approx (Haversine) -> km
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

// Connect socket once and reuse
const client = new net.Socket();
client.setEncoding('utf8');

client.connect(PORT, HOST, () => {
  console.log(`Connected to TCP ${HOST}:${PORT}`);

  let idx = 0;
  let prev = route[0];

  const sendPacket = () => {
    const point = route[idx % route.length];

    // compute speed from previous point (approx) -> km/h
    const distKm = haversineKm(prev, point);
    // if distance small, keep moderate speed; convert per 3s interval -> estimate instantaneous speed
    const speedKph = Math.min(80, Math.max(10, Math.round(distKm / (INTERVAL_MS/1000/3600) )));

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
      batteryLevel: 90,
      signalStrength: 4,
      temperature: '36C',
      timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(packet);
    console.log('Sending packet:', json);
    client.write(json + '\n');

    prev = point;
    idx++;
  };

  // send first packet immediately then every INTERVAL_MS
  sendPacket();
  const timer = setInterval(sendPacket, INTERVAL_MS);

  // handle clean exit
  const cleanup = () => {
    clearInterval(timer);
    client.end();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});

client.on('error', (err) => {
  console.error('TCP client error:', err && err.message ? err.message : err);
  process.exit(2);
});
