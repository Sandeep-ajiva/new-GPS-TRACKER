const net = require("net");
const GpsService = require("../Modules/gpsLiveData/service");

const startTcpServer = (port = 6000) => {
    const server = net.createServer((socket) => {
        console.log("Device connected:", socket.remoteAddress);

        socket.on("data", async (data) => {
            const dataString = data.toString().trim();
            console.log("TCP Data:", dataString);

            // Accept either JSON payloads or legacy CSV: IMEI,LAT,LNG,SPEED,IGNITION
            // Try JSON first, fall back to CSV parsing for existing devices.
            let payload = null;
            let parsedAs = null;
            try {
                payload = JSON.parse(dataString);
                parsedAs = 'json';
            } catch (e) {
                const parts = dataString.split(",");
                if (parts.length >= 3) {
                    payload = {
                        imei: parts[0],
                        lat: parts[1],
                        lng: parts[2],
                        speed: parts[3] || 0,
                        ignition: parts[4] === "1"
                    };
                    parsedAs = 'csv';
                }
            }

            if (!payload) {
                socket.write("ERROR: invalid payload\n");
                return;
            }

            console.log(`Parsed TCP payload as ${parsedAs}`);

            try {
                // Normalize payload keys so service can accept either CSV-style or JSON keys
                const normalized = Object.assign({}, payload);
                // latitude / longitude -> lat / lng
                if (normalized.latitude && !normalized.lat) normalized.lat = normalized.latitude;
                if (normalized.longitude && !normalized.lng) normalized.lng = normalized.longitude;
                // currentSpeed -> speed
                if (normalized.currentSpeed && !normalized.speed) normalized.speed = normalized.currentSpeed;
                // ignitionStatus -> ignition
                if (typeof normalized.ignitionStatus !== 'undefined' && typeof normalized.ignition === 'undefined') normalized.ignition = normalized.ignitionStatus;

                const result = await GpsService.processGpsData(normalized);
                if (result.success) {
                    socket.write("ACK\n");
                } else {
                    socket.write(`ERROR: ${result.message}\n`);
                }
            } catch (err) {
                console.error('Error processing GPS data:', err && err.stack ? err.stack : err);
                socket.write(`ERROR: ${err && err.message ? err.message : 'processing error'}\n`);
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
