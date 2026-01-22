require('dotenv').config();
const mongoose = require('mongoose');

const GpsLiveData = require('../Modules/gpsLiveData/model');
const GpsHistory = require('../Modules/gpsHistory/model');

const MONGO_URI = process.env.MONGO_URI || process.argv[2] || 'mongodb://127.0.0.1:27017/gps_tracker';

async function connect() {
  await mongoose.connect(MONGO_URI);
}

function dumpDocs(liveDocs, historyDocs) {
  console.clear();
  console.log('===== Latest GpsLiveData =====');
  liveDocs.forEach(d => {
    console.log({
      _id: d._id.toString(),
      gpsDeviceId: d.gpsDeviceId?.toString(),
      vehicleId: d.vehicleId?.toString(),
      lat: d.latitude,
      lng: d.longitude,
      speed: d.currentSpeed,
      ignition: d.ignitionStatus,
      updatedAt: d.updatedAt
    });
  });

  console.log('\n===== Latest GpsHistory =====');
  historyDocs.forEach(h => {
    console.log({
      _id: h._id.toString(),
      gpsDeviceId: h.gpsDeviceId?.toString(),
      vehicleId: h.vehicleId?.toString(),
      lat: h.latitude,
      lng: h.longitude,
      speed: h.speed,
      timestamp: h.timestamp || h.recordedAt
    });
  });

  console.log('\n(Press CTRL+C to stop)');
}

async function watch() {
  await connect();
  console.log('Connected to', MONGO_URI);

  // poll every 3 seconds
  const interval = 3000;
  const run = async () => {
    try {
      const liveDocs = await GpsLiveData.find().sort({ updatedAt: -1 }).limit(10).lean();
      const historyDocs = await GpsHistory.find().sort({ timestamp: -1 }).limit(10).lean();
      dumpDocs(liveDocs, historyDocs);
    } catch (e) {
      console.error('Watch error:', e && e.message ? e.message : e);
    }
  };

  await run();
  const t = setInterval(run, interval);

  process.on('SIGINT', async () => {
    clearInterval(t);
    await mongoose.disconnect();
    console.log('\nWatcher stopped');
    process.exit(0);
  });
}

watch().catch(err => {
  console.error('Failed to start watcher:', err && err.message ? err.message : err);
  process.exit(1);
});
