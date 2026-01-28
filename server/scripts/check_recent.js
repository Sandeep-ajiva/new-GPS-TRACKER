require('dotenv').config();
const mongoose = require('mongoose');
const GpsLiveData = require('../Modules/gpsLiveData/model');
const GpsHistory = require('../Modules/gpsHistory/model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gps_tracker';

(async ()=>{
  try{
    await mongoose.connect(MONGO_URI);
    const live = await GpsLiveData.find().sort({updatedAt:-1}).limit(5).lean();
    const hist = await GpsHistory.find().sort({timestamp:-1}).limit(5).lean();
    console.log('=== Live ===');
    live.forEach(d=> console.log(JSON.stringify(d)));
    console.log('=== History ===');
    hist.forEach(h=> console.log(JSON.stringify(h)));
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();