const net = require("net");
const GpsService = require("../Modules/gpsLiveData/service");

const startTcpServer = (port = 6000) => {
    const server = net.createServer((socket) => {
        console.log("Device connected:", socket.remoteAddress);

        socket.on("data", async (data) => {
            const dataString = data.toString().trim();
            console.log("TCP Data:", dataString);

            // Basic Protocol: IMEI,LAT,LNG,SPEED,IGNITION
            // Example: 123456789012345,12.34,56.78,60,1
            const parts = dataString.split(",");
            if (parts.length >= 3) {
                const payload = {
                    imei: parts[0],
                    lat: parts[1],
                    lng: parts[2],
                    speed: parts[3] || 0,
                    ignition: parts[4] === "1"
                };

                const result = await GpsService.processGpsData(payload);
                if (result.success) {
                    socket.write("ACK\n");
                } else {
                    socket.write(`ERROR: ${result.message}\n`);
                }
            }
        });

        socket.on("error", (err) => {
            console.error("TCP Socket Error:", err.message);
        });

        socket.on("close", () => {
            console.log("Device disconnected");
        });
    });

    server.listen(port, () => {
        console.log(`✅ TCP Server running on port ${port}`);
    });

    server.on("error", (err) => {
        console.error("TCP Server Error:", err);
    });
};

module.exports = startTcpServer;
