require('dotenv').config();
const connectDB = require('../config/database');
const redisClient = require('../config/redis');
const startTcpServer = require('../tcp/index');

(async () => {
  // ensure DB connected
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gps_tracker';
  process.env.MONGO_URI = MONGO_URI;
  console.log('Connecting DB for TCP-only runner...');
  await connectDB();

  // Redis client already connects on require in config/redis
  console.log('Starting TCP server on port', process.env.TCP_PORT || 6000);
  startTcpServer(process.env.TCP_PORT || 6000);

  // keep process alive
  process.on('SIGINT', () => {
    console.log('Shutting down TCP-only runner');
    process.exit(0);
  });
})();
