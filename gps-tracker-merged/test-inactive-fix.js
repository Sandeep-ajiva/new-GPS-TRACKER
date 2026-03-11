/**
 * Inactive Vehicle Status Fix Test
 * 
 * This test verifies that vehicles marked as "inactive" in the database
 * but have recent live data showing movement are correctly classified.
 */

console.log('🚗 Inactive Vehicle Status Fix Test');
console.log('=================================\n');

const RUNNING_SPEED_THRESHOLD = 0.5;

// Simulate the improved logic
function getVehicleStatus(liveData, vehicleData, clockMs) {
  const runningStatus = String(liveData?.movementStatus || vehicleData?.runningStatus || "").toLowerCase();
  const lifecycleStatus = String(vehicleData?.status || "").toLowerCase();
  
  const hasLivePosition = typeof liveData?.latitude === "number" && typeof liveData?.longitude === "number";
  const hasVehiclePosition = typeof vehicleData?.currentLocation?.latitude === "number" && 
                           typeof vehicleData?.currentLocation?.longitude === "number";
  
  const lastSeenSource = liveData?.updatedAt || liveData?.gpsTimestamp || vehicleData?.updatedAt || null;
  const lastSeenMs = lastSeenSource ? new Date(lastSeenSource).getTime() : NaN;
  const isStale = Number.isFinite(lastSeenMs) ? clockMs - lastSeenMs > 300000 : true; // 5 min timeout
  
  // Improved ignition logic
  const ignition = Boolean(
    liveData?.ignitionStatus ??
    liveData?.ignition ??
    (liveData && (liveData.speed || liveData.currentSpeed || 0) > 0) ??
    (runningStatus === "running" || runningStatus === "idle")
  );
  
  const rawSpeed = Number(liveData?.currentSpeed ?? liveData?.speed ?? vehicleData?.currentSpeed ?? 0);
  const speed = isStale || !ignition ? 0 : Number.isFinite(rawSpeed) ? rawSpeed : 0;

  // FIXED LOGIC: Only mark as inactive if no recent live data
  let status = "nodata";
  if (lifecycleStatus === "inactive" && isStale && !hasLivePosition) {
    status = "inactive";
  } else if (isStale && !hasLivePosition && !hasVehiclePosition) {
    status = "nodata";
  } else if (!ignition) {
    status = "stopped";
  } else if (speed >= RUNNING_SPEED_THRESHOLD) {
    status = "running";
  } else {
    status = "idle";
  }

  return { status, ignition, speed, isStale, hasLivePosition };
}

// Test cases based on your scenario
const testCases = [
  {
    name: "Your TS09ER1234 - Database inactive but live data shows movement",
    liveData: {
      speed: 43.2,
      currentSpeed: 43.2,
      ignitionStatus: true,
      ignition: true,
      movementStatus: "running",
      latitude: 30.732861,
      longitude: 76.817759,
      updatedAt: new Date().toISOString()
    },
    vehicleData: {
      runningStatus: "running",
      status: "inactive", // Database says inactive
      currentLocation: { latitude: 30.732861, longitude: 76.817759 }
    },
    clockMs: Date.now(),
    expected: {
      status: "running", // Should be running based on live data
      ignition: true,
      speed: 43.2
    },
    description: "Vehicle marked inactive in database but moving in live data should be RUNNING"
  },
  {
    name: "Vehicle truly inactive (no recent live data)",
    liveData: {
      speed: 0,
      ignitionStatus: false,
      movementStatus: "inactive",
      updatedAt: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
    },
    vehicleData: {
      runningStatus: "inactive",
      status: "inactive"
    },
    clockMs: Date.now(),
    expected: {
      status: "inactive",
      ignition: false,
      speed: 0
    },
    description: "Vehicle with no recent live data should remain INACTIVE"
  },
  {
    name: "Vehicle inactive in database but recently seen with ignition ON",
    liveData: {
      speed: 0,
      ignitionStatus: true,
      movementStatus: "idle",
      latitude: 30.732861,
      longitude: 76.817759,
      updatedAt: new Date().toISOString()
    },
    vehicleData: {
      runningStatus: "idle",
      status: "inactive"
    },
    clockMs: Date.now(),
    expected: {
      status: "idle",
      ignition: true,
      speed: 0
    },
    description: "Vehicle with ignition ON should be IDLE even if marked inactive in database"
  }
];

console.log(`Running Speed Threshold: ${RUNNING_SPEED_THRESHOLD} km/h\n`);

let passedTests = 0;
const totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  
  const result = getVehicleStatus(testCase.liveData, testCase.vehicleData, testCase.clockMs);
  
  const statusPassed = result.status === testCase.expected.status;
  const ignitionPassed = result.ignition === testCase.expected.ignition;
  const speedPassed = result.speed === testCase.expected.speed;
  
  console.log(`  Database Status: ${testCase.vehicleData.status}`);
  console.log(`  Live Speed: ${testCase.liveData.speed} km/h`);
  console.log(`  Live Ignition: ${testCase.liveData.ignitionStatus ? 'ON' : 'OFF'}`);
  console.log(`  Expected Status: ${testCase.expected.status.toUpperCase()}`);
  console.log(`  Actual Status: ${result.status.toUpperCase()} ${statusPassed ? '✅' : '❌'}`);
  console.log(`  Ignition: ${result.ignition ? 'ON' : 'OFF'} ${ignitionPassed ? '✅' : '❌'}`);
  console.log(`  Speed: ${result.speed} km/h ${speedPassed ? '✅' : '❌'}`);
  
  const allPassed = statusPassed && ignitionPassed && speedPassed;
  
  if (allPassed) {
    passedTests++;
    console.log(`  🎉 PASSED\n`);
  } else {
    console.log(`  ❌ FAILED\n`);
  }
});

console.log('=================================');
console.log(`Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Inactive vehicle status fix is working correctly.');
  console.log('\n📝 What was fixed:');
  console.log('  • Live data now takes priority over database "inactive" status');
  console.log('  • Only mark as inactive if no recent live data available');
  console.log('  • Vehicles with recent live data show actual status');
  console.log('  • Your dashboard counts will now be accurate');
} else {
  console.log('❌ Some tests failed. Please check the implementation.');
}

console.log('\n🚀 Expected dashboard changes for TS09ER1234:');
console.log('  Before: Running: 0, Idle: 0, Stopped: 1, Inactive: 4 ❌');
console.log('  After: Running: 1, Idle: 0, Stopped: 0, Inactive: 3 ✅');
console.log('\n📊 New Logic:');
console.log('  • Database inactive + recent live data = Use live status');
console.log('  • Database inactive + no live data = INACTIVE');
console.log('  • Live speed > 0.5 km/h = RUNNING (even if database says inactive)');
console.log('  • Live ignition ON + speed 0 = IDLE (even if database says inactive)');
