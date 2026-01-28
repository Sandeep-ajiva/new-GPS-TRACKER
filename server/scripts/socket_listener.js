// Usage: node socket_listener.js <serverUrl> <orgId> <vehicleId>
// Example: node socket_listener.js http://localhost:3000 697266c0e208fc85d6389839 697266c0e208fc85d638983f

const io = require('socket.io-client');

const SERVER = process.argv[2] || 'http://localhost:3000';
const ORG = process.argv[3];
const VEH = process.argv[4];

if (!ORG && !VEH) {
  console.error('Provide orgId or vehicleId to listen to rooms.');
  console.error('Usage: node socket_listener.js http://localhost:3000 <orgId> <vehicleId>');
  process.exit(1);
}

const socket = io(SERVER, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('connected to', SERVER, 'id', socket.id);
  if (ORG) socket.emit('join', `org_${ORG}`);
  if (VEH) socket.emit('join', `vehicle_${VEH}`);
});

socket.on('vehicle_daily_stats', (data) => {
  console.log('vehicle_daily_stats:', JSON.stringify(data, null, 2));
});

socket.on('alert', (data) => {
  console.log('alert:', JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => console.log('disconnected'));

socket.on('connect_error', (err) => {
  console.error('connect_error', err && err.message ? err.message : err);
  process.exit(2);
});
