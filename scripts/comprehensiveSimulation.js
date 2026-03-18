const net = require("net");

// ==========================================
// DEVICE CONFIG
// ==========================================
const IMEI = "123456789099111";
const VEHICLE_NO = "PB-07-5587";

const START_LAT = 30.72772286091969;
const START_LNG = 76.76703872448844;

const END_LAT = 30.908469605619075;
const END_LNG = 77.09933396927974;

const HOST = "127.0.0.1";
const PORT = 6000;

const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=";

// ==========================================
// HELPERS
// ==========================================
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const pad2 = (v) => String(v).padStart(2, "0");

const checksum = (body) => {
    let x = 0;
    for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return x.toString(16).toUpperCase().padStart(2, "0");
};

const withCS = (b) => `$${b}*${checksum(b)}\n`;

const toNmea = (dec, isLat) => {
    const abs = Math.abs(dec);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const ddmm = deg * 100 + min;
    return {
        v: ddmm.toFixed(4),
        d: isLat ? (dec >= 0 ? "N" : "S") : dec >= 0 ? "E" : "W",
    };
};

const dtParts = (offsetSec = 0) => {
    const d = new Date();
    d.setSeconds(d.getSeconds() + offsetSec);
    return {
        date: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
        time: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
    };
};

const loginPacket = () => `$LGN,${VEHICLE_NO},${IMEI},2.5AIS\n`;

function packet({ lat, lng, speed, heading, ignition, ac, odo, offset }) {
    const { date, time } = dtParts(offset);
    const latN = toNmea(lat, true);
    const lngN = toNmea(lng, false);

    const status = `000${ignition}${ac}1`;

    const body = [
        "NRM",
        IMEI,
        date,
        time,
        latN.v,
        latN.d,
        lngN.v,
        lngN.d,
        speed.toFixed(1),
        heading.toFixed(1),
        "12",
        "250",
        "1.1",
        "0.8",
        "Simulator-Pro",
        "404",
        status,
        Math.floor(odo).toString(),
        "12.8",
    ].join(",");

    return withCS(body);
}

// ==========================================
// ROUTE FETCH
// ==========================================
async function fetchRoute() {
    const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
            method: "POST",
            headers: {
                Authorization: ORS_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                coordinates: [
                    [START_LNG, START_LAT],
                    [END_LNG, END_LAT],
                ],
            }),
        }
    );

    const data = await res.json();
    return data.features[0].geometry.coordinates.map(([lng, lat]) => ({
        lat,
        lng,
    }));
}

// ==========================================
// SEND HELPER
// ==========================================
async function sendRepeated(socket, point, count, config, offsetRef) {
    for (let i = 0; i < count; i++) {
        socket.write(packet({
            ...point,
            ...config,
            offset: offsetRef.value,
        }));
        offsetRef.value += 60;
        await delay(120);
    }
}

// ==========================================
// MAIN
// ==========================================
async function run() {
    const coords = await fetchRoute();

    const socket = net.createConnection({ host: HOST, port: PORT }, async () => {
        console.log("Connected");

        socket.write(loginPacket());

        let odo = 23000;
        let offset = { value: 0 };

        // ==========================================
        // TRIP START IDLE (Ignition ON, speed 0)
        // ==========================================
        console.log("Trip start idle");

        await sendRepeated(
            socket,
            coords[0],
            4,
            {
                speed: 0,
                heading: 0,
                ignition: 1,
                ac: 1,
                odo,
            },
            offset
        );

        // ==========================================
        // MOVEMENT PHASE
        // ==========================================
        for (let i = 1; i < coords.length; i++) {
            let speed = 45;
            let ac = 1;

            if (i > 5 && i < 10) speed = 88; // overspeed
            if (i > 12 && i < 18) ac = 0;    // AC off zone

            odo += 0.4;

            socket.write(packet({
                ...coords[i],
                speed,
                heading: 90,
                ignition: 1,
                ac,
                odo,
                offset: offset.value,
            }));

            offset.value += 30;
            await delay(150);

            // ==========================================
            // MID IDLE STOP
            // ==========================================
            if (i === Math.floor(coords.length / 2)) {
                console.log("Mid idle stop");

                await sendRepeated(
                    socket,
                    coords[i],
                    5,
                    {
                        speed: 0,
                        heading: 0,
                        ignition: 1,
                        ac: 0,
                        odo,
                    },
                    offset
                );
            }
        }

        // ==========================================
        // TRIP END IDLE
        // ==========================================
        console.log("Trip ending idle");

        await sendRepeated(
            socket,
            coords[coords.length - 1],
            5,
            {
                speed: 0,
                heading: 0,
                ignition: 1,
                ac: 0,
                odo,
            },
            offset
        );

        // ==========================================
        // IGNITION OFF = CLOSE TRIP
        // ==========================================
        console.log("Ignition OFF");

        await sendRepeated(
            socket,
            coords[coords.length - 1],
            3,
            {
                speed: 0,
                heading: 0,
                ignition: 0,
                ac: 0,
                odo,
            },
            offset
        );

        socket.end();
    });

    socket.on("error", console.error);
}

run();