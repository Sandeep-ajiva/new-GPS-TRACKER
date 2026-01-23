const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
const CREDENTIALS = {
    email: 'superadmin@gmail.com',
    password: 'admin@123'
};

let token = '';
let testContext = {
    orgId: '',
    deviceId: '',
    vehicleId: '',
    driverId: '',
};

/**
 * Helper to make HTTP requests
 */
function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            console.error(`Request Error (${method} ${path}):`, err.message);
            reject(err);
        });

        if (data) {
            const payload = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(payload);
            req.write(payload);
        }
        req.end();
    });
}

async function runTests() {
    console.log('🚀 Starting Comprehensive API Verification (Fixed Payloads)...\n');

    // 1. Auth Test
    console.log('--- [1] Auth ---');
    const loginRes = await request('POST', '/users/login', CREDENTIALS);
    if (loginRes.status === 200 && loginRes.data.status) {
        token = loginRes.data.token;
        console.log('✅ Login Successful');
    } else {
        console.error('❌ Login Failed:', loginRes.data);
        return;
    }

    // 2. Organization Test
    console.log('\n--- [2] Organizations ---');
    const orgsRes = await request('GET', '/organizations');
    if (orgsRes.status === 200) {
        console.log(`✅ GET /organizations Successful (Count: ${orgsRes.data.data ? orgsRes.data.data.length : 0})`);
        if (orgsRes.data.data && orgsRes.data.data.length > 0) {
            testContext.orgId = orgsRes.data.data[0]._id;
        }
    } else {
        console.error('❌ GET /organizations Failed:', orgsRes.data);
    }

    // 3. Create GPS Device
    console.log('\n--- [3] GPS Device ---');
    const dummyImei = `IMEI${Date.now()}`;
    const devicePayload = {
        imei: dummyImei,
        deviceModel: 'TestModel X',
        manufacturer: 'Test Brand',
        simNumber: '1234567890',
        serialNumber: `SN${Date.now()}`,
        firmwareVersion: '1.0.0',
        hardwareVersion: '1.0.0',
        warrantyExpiry: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
        status: 'active',
        organizationId: testContext.orgId
    };
    const deviceRes = await request('POST', '/gpsdevice', devicePayload);
    if (deviceRes.status === 201) {
        testContext.deviceId = deviceRes.data.data._id;
        console.log(`✅ POST /gpsdevice Successful (IMEI: ${dummyImei})`);
    } else {
        console.error('❌ POST /gpsdevice Failed:', JSON.stringify(deviceRes.data, null, 2));
    }

    // 4. Create Vehicle
    console.log('\n--- [4] Vehicle ---');
    const dummyPlate = `TEST${Math.floor(Math.random() * 10000)}`;
    const vehiclePayload = {
        vehicleType: 'car',
        vehicleNumber: dummyPlate,
        make: 'TestMake',
        model: 'TestModel',
        color: 'Blue',
        status: 'active',
        organizationId: testContext.orgId
    };
    const vehicleRes = await request('POST', '/vehicle', vehiclePayload);
    if (vehicleRes.status === 201) {
        testContext.vehicleId = vehicleRes.data.data._id;
        console.log(`✅ POST /vehicle Successful (Plate: ${dummyPlate})`);
    } else {
        console.error('❌ POST /vehicle Failed:', JSON.stringify(vehicleRes.data, null, 2));
    }

    // 5. Create Driver
    console.log('\n--- [5] Driver ---');
    const driverPayload = {
        firstName: 'John',
        lastName: 'Doe',
        phone: `99${Date.now().toString().slice(-8)}`,
        email: `driver${Date.now()}@test.com`,
        licenseNumber: `LIC${Date.now()}`,
        licenseExpiry: new Date(Date.now() + 31536000000).toISOString(),
        photo: 'http://example.com/photo.jpg',
        address: '123 Test St',
        status: 'active',
        organizationId: testContext.orgId
    };
    const driverRes = await request('POST', '/drivers', driverPayload);
    if (driverRes.status === 201) {
        testContext.driverId = driverRes.data.data._id;
        console.log('✅ POST /drivers Successful');
    } else {
        console.error('❌ POST /drivers Failed:', JSON.stringify(driverRes.data, null, 2));
    }

    // 6. Mapping Test (Assign Device to Vehicle)
    console.log('\n--- [6] Vehicle Mapping ---');
    if (testContext.vehicleId && testContext.deviceId) {
        const mapRes = await request('POST', '/vehiclemapping/assign', {
            vehicleId: testContext.vehicleId,
            gpsDeviceId: testContext.deviceId,
            organizationId: testContext.orgId
        });
        if (mapRes.status === 201) {
            console.log('✅ POST /vehiclemapping/assign Successful');
        } else {
            console.error('❌ POST /vehiclemapping/assign Failed:', JSON.stringify(mapRes.data, null, 2));
        }
    }

    // 7. Verification of paginated GET routes
    console.log('\n--- [7] Verification of Pagination ---');
    const routesToTest = [
        '/alerts',
        '/geofence',
        '/poi',
        '/vehicledailystats',
        '/gpshistory'
    ];

    for (const route of routesToTest) {
        const res = await request('GET', route);
        if (res.status === 200) {
            const hasPagination = res.data.pagination ? 'YES' : 'NO';
            console.log(`✅ GET ${route} Successful (Paginated: ${hasPagination})`);
        } else {
            console.error(`❌ GET ${route} Failed:`, res.status, res.data);
        }
    }

    console.log('\n--- Verification Summary ---');
    console.log('Context:', testContext);
    console.log('\n✅ Comprehensive API Verification Task Complete');
}

runTests().catch(console.error);
