/**
 * clear-address-cache.js
 * Run once to clear stale coordinate-fallback address cache from Redis.
 * Place in: server/scripts/clear-address-cache.js
 * Run with: node scripts/clear-address-cache.js
 */

const redisClient = require("../config/redis");

async function clearAddressCache() {
  try {
    console.log("🔍 Scanning for stale address cache keys...");

    const keys = await redisClient.keys("location:address:*");

    if (keys.length === 0) {
      console.log("✅ No address cache keys found — nothing to clear");
      return;
    }

    console.log(`Found ${keys.length} cached address keys`);

    // Delete in batches of 100 to avoid blocking Redis
    const batchSize = 100;
    let deleted = 0;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await redisClient.del(...batch);
      deleted += batch.length;
      console.log(`  Deleted ${deleted}/${keys.length} keys...`);
    }

    console.log(`✅ Done — cleared ${deleted} stale address cache entries`);
    console.log("   Addresses will re-resolve on next GPS packet from each vehicle");

  } catch (err) {
    console.error("❌ Error clearing cache:", err.message);
  } finally {
    process.exit(0);
  }
}

clearAddressCache();