require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('../Modules/alerts/model');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gps_tracker';

(async ()=>{
  try{
    await mongoose.connect(MONGO_URI);
    const alerts = await Alert.find().sort({createdAt:-1}).limit(10).lean();
    console.log('=== Alerts ===');
    alerts.forEach(a=> console.log(JSON.stringify(a)));
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();