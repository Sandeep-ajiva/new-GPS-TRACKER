const net = require("net");

const client = new net.Socket();
const HOST = "127.0.0.1";
const PORT = 6000;

const IMEI = "123456789012316";

function sendData() {
    const lat = (12.90 + Math.random() * 0.05).toFixed(6);
    const lng = (77.50 + Math.random() * 0.05).toFixed(6);
    const speed = Math.floor(Math.random() * 80);
    const ignition = Math.random() > 0.5 ? 1 : 0;

    const payload = `${IMEI},${lat},${lng},${speed},${ignition}`;
    console.log("📡 Sending:", payload);

    client.write(payload);
}

client.connect(PORT, HOST, () => {
    console.log("✅ Fake GPS connected");
    setInterval(sendData, 5000);
});






