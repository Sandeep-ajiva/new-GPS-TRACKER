const redisClient = require("./config/redis");

async function clearAddressCache() {
  try {
    const keys = await redisClient.keys("location:address:*");
    if (keys.length === 0) {
      console.log("No address cache keys found");
      return;
    }
    await redisClient.del(...keys);
    console.log(`✅ Deleted ${keys.length} address cache keys`);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

clearAddressCache();