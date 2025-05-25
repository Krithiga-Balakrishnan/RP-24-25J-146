const mongoose = require("mongoose");

async function connectWithRetry(uri, attempts = 5) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      if (mongoose.connection.readyState === 0) {
        console.log(`🔄 MongoDB attempt ${i}/${attempts}`);
        await mongoose.connect(uri, { });
      }
      console.log("✅ MongoDB connected");
      return;
    } catch (err) {
      lastErr = err;
      console.error(`⛔ connect attempt ${i} failed:`, err.message);
      await new Promise(r => setTimeout(r, 2000)); // 2-s pause
    }
  }
  console.error("❌ Exhausted retries, giving up.");
  throw lastErr;
}

module.exports = connectWithRetry;
