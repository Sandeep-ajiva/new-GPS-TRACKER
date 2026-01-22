require('dotenv').config();
const mongoose = require('mongoose');
const VehicleDailyStats = require('../Modules/vehicleDailyStats/model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gps_tracker';
const VEHICLE_ID = process.argv[2] || process.env.VEHICLE_ID;

(async ()=>{
  try{
    await mongoose.connect(MONGO_URI);
    const query = VEHICLE_ID ? { vehicleId: VEHICLE_ID } : {};
    const docs = await VehicleDailyStats.find(query).sort({ date: -1 }).limit(5).lean();
    console.log('=== VehicleDailyStats ===');
    docs.forEach(d=> console.log(JSON.stringify(d, null, 2)));
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();