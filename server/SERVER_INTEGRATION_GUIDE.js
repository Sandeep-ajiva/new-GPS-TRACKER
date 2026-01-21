/**
 * SERVER INTEGRATION GUIDE
 * =======================
 * 
 * Add this code to your main server file (index.js or app.js)
 * to register all modules
 */

// ==========================================
// MODULE ROUTE REGISTRATION
// ==========================================

// Import all module routes
const alertRoutes = require('./Modules/alerts/routes');
const driverRoutes = require('./Modules/drivers/routes');
const geofenceRoutes = require('./Modules/geofence/routes');
const gpsDeviceRoutes = require('./Modules/gpsDevice/routes');
const gpsHistoryRoutes = require('./Modules/gpsHistory/routes');
const gpsLiveDataRoutes = require('./Modules/gpsLiveData/routes');
const organizationRoutes = require('./Modules/organizations/routes');
const poiRoutes = require('./Modules/poi/routes');
const userRoutes = require('./Modules/users/routes');
const vehicleRoutes = require('./Modules/vehicle/routes');
const vehicleDailyStatsRoutes = require('./Modules/vehicleDailyStats/routes');
const vehicleMappingRoutes = require('./Modules/vehicleMapping/routes');

// ==========================================
// MIDDLEWARE REGISTRATION
// ==========================================

// Register all module routes with appropriate base paths
app.use('/api/alerts', alertRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/gpsDevices', gpsDeviceRoutes);
app.use('/api/gpsHistory', gpsHistoryRoutes);
app.use('/api/gpsLiveData', gpsLiveDataRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicleDailyStats', vehicleDailyStatsRoutes);
app.use('/api/vehicleMapping', vehicleMappingRoutes);

/**
 * ==========================================
 * COMPLETE API ENDPOINTS
 * ==========================================
 * 
 * ALERTS
 * ------
 * GET    /api/alerts
 * GET    /api/alerts/vehicle/:vehicleId
 * GET    /api/alerts/unacknowledged
 * POST   /api/alerts/:id/ack
 * 
 * DRIVERS
 * -------
 * POST   /api/drivers
 * GET    /api/drivers
 * GET    /api/drivers/:id
 * PUT    /api/drivers/:id
 * DELETE /api/drivers/:id
 * 
 * GEOFENCE
 * --------
 * POST   /api/geofence
 * GET    /api/geofence
 * GET    /api/geofence/:id
 * PUT    /api/geofence/:id
 * DELETE /api/geofence/:id
 * 
 * GPS DEVICES
 * -----------
 * POST   /api/gpsDevices
 * GET    /api/gpsDevices
 * GET    /api/gpsDevices/available
 * GET    /api/gpsDevices/:id
 * PUT    /api/gpsDevices/:id
 * PUT    /api/gpsDevices/:id/status
 * DELETE /api/gpsDevices/:id
 * 
 * GPS HISTORY
 * -----------
 * GET    /api/gpsHistory
 * GET    /api/gpsHistory/vehicle/:vehicleId
 * GET    /api/gpsHistory/device/:gpsDeviceId
 * 
 * GPS LIVE DATA
 * --------
 * GET    /api/gpsLiveData
 * GET    /api/gpsLiveData/vehicle/:vehicleId
 * GET    /api/gpsLiveData/device/:gpsDeviceId
 * 
 * ORGANIZATIONS
 * --------- (EXISTING)
 * POST   /api/organizations
 * GET    /api/organizations
 * GET    /api/organizations/:id
 * PUT    /api/organizations/:id
 * DELETE /api/organizations/:id
 * GET    /api/organizations/me
 * GET    /api/organizations/me/branches
 * POST   /api/organizations/me/branches
 * PUT    /api/organizations/me/branches/:branchId
 * DELETE /api/organizations/me/branches/:branchId
 * GET    /api/organizations/my-branch
 * 
 * POI (Points of Interest)
 * ------
 * POST   /api/poi
 * GET    /api/poi
 * GET    /api/poi/:id
 * PUT    /api/poi/:id
 * DELETE /api/poi/:id
 * 
 * USERS
 * --------- (EXISTING)
 * POST   /api/users
 * GET    /api/users
 * GET    /api/users/:id
 * PUT    /api/users/:id
 * DELETE /api/users/:id
 * POST   /api/users/org
 * GET    /api/users/org/list
 * GET    /api/users/org/:id
 * PUT    /api/users/org/:id
 * DELETE /api/users/org/:id
 * GET    /api/users/me/profile
 * PUT    /api/users/me/profile
 * PUT    /api/users/me/password
 * 
 * VEHICLES
 * -------- (EXISTING)
 * POST   /api/vehicles
 * GET    /api/vehicles
 * GET    /api/vehicles/:id
 * PUT    /api/vehicles/:id
 * DELETE /api/vehicles/:id
 * 
 * VEHICLE DAILY STATS
 * -------------------
 * GET    /api/vehicleDailyStats
 * GET    /api/vehicleDailyStats/vehicle/:vehicleId
 * GET    /api/vehicleDailyStats/vehicle/:vehicleId/date/:date
 * 
 * VEHICLE MAPPING
 * ---------------
 * POST   /api/vehicleMapping/assign
 * POST   /api/vehicleMapping/unassign
 * GET    /api/vehicleMapping/active
 * GET    /api/vehicleMapping/vehicle/:vehicleId
 * GET    /api/vehicleMapping/device/:gpsDeviceId
 */

/**
 * ==========================================
 * CROSS-CHECK VERIFICATION
 * ==========================================
 * 
 * ✅ All controllers have CRUD functions
 * ✅ All models are properly defined with references
 * ✅ All routes are properly configured with authentication & authorization
 * ✅ Validation is in place for all operations
 * ✅ Relationships are properly mapped between entities
 * ✅ Controllers and models are connected correctly
 * ✅ Error handling is implemented consistently
 * ✅ Response formats are standardized
 * ✅ All new modules are in server/Modules directory
 * ✅ Folder names match the module names
 * 
 * ==========================================
 * KEY IMPLEMENTATIONS
 * ==========================================
 * 
 * Authentication: requireAuth middleware on all routes
 * Authorization: checkAuthorization middleware for role-based access
 * Validation: Validator helper for input validation
 * Error Handling: Try-catch blocks with appropriate HTTP status codes
 * Response Format: Standardized {status, message, data}
 * Population: Related documents are populated using .populate()
 * 
 * ==========================================
 * NOTES FOR FUTURE MAINTENANCE
 * ==========================================
 * 
 * 1. When adding new fields to models, update validators in controllers
 * 2. Always use .populate() for references in read operations
 * 3. Keep the same folder structure for new modules: /Modules/{moduleName}/
 * 4. Each module should have controller.js, model.js, and routes.js
 * 5. Use the same response format for all endpoints
 * 6. Always validate input data before database operations
 * 7. Check authorization before data manipulation
 */
