const Redis = require("ioredis");
require("dotenv").config();

const redisClient = new Redis(process.env.REDIS_URI || "redis://localhost:6379");

redisClient.on("connect", () => {
    console.log("✅ Redis Connected");
});

redisClient.on("error", (err) => {
    console.error("❌ Redis Connection Error:", err);
});

module.exports = redisClient;
