const VehicleMapping = require('./model');
const Validator = require('../../helpers/validators');
const mongoose = require('mongoose');
const VehicleModel = require('../vehicle/model');
const DeviceModel = require('../gpsDevice/model');

const validateVehicleMappingData = async (data) => {
    const rules = {
        vehicleId: "required|string",
        gpsDeviceId: "required|string",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.assign = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await validateVehicleMappingData(req.body);

    const organizationId = req.orgId;
    const { vehicleId, gpsDeviceId } = req.body;

    /**
     * Extra safety (even though middleware exists)
     */
    // if (req.user.role !== "superadmin" && organizationId !== req.orgId.toString()) {
    //   return res.status(403).json({
    //     status: false,
    //     message: "Forbidden: Cannot assign devices to other organizations"
    //   });
    // }

    if (
      !mongoose.isValidObjectId(vehicleId) ||
      !mongoose.isValidObjectId(gpsDeviceId) ||
      !mongoose.isValidObjectId(organizationId)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid vehicle ID, GPS device ID, or organization ID"
      });
    }

    /**
     * 🔒 Ensure device not already assigned
     */
    const deviceAlreadyMapped = await VehicleMapping.findOne({
      gpsDeviceId,
      unassignedAt: null
    }).session(session);

    if (deviceAlreadyMapped) {
      throw { status: 409, message: "GPS device already assigned to another vehicle" };
    }

    /**
     * 🔒 Ensure vehicle does not already have a device
     */
    const vehicleAlreadyMapped = await VehicleMapping.findOne({
      vehicleId,
      unassignedAt: null
    }).session(session);

    if (vehicleAlreadyMapped) {
      throw { status: 409, message: "Vehicle already has an assigned GPS device" };
    }

    /**
     * 🔍 Validate existence
     */
    const vehicle = await VehicleModel.findById(vehicleId).session(session);
    const device = await DeviceModel.findById(gpsDeviceId).session(session);

    if (!vehicle || !device) {
      throw { status: 404, message: "Vehicle or GPS device not found" };
    }

    /**
     * 🧩 Create mapping
     */
    const [vehicleMapping] = await VehicleMapping.create(
      [{
        organizationId,
        vehicleId,
        gpsDeviceId,
        assignedAt: new Date(),
        unassignedAt: null
      }],
      { session }
    );

    /**
     * 🔄 Sync references
     */
    vehicle.deviceId = gpsDeviceId;
    device.vehicleId = vehicleId;

    await vehicle.save({ session });
    await device.save({ session });

    await session.commitTransaction();

    await vehicleMapping.populate([
      { path: "organizationId" },
      { path: "vehicleId" },
      { path: "gpsDeviceId" }
    ]);

    return res.status(201).json({
      status: true,
      message: "Device assigned to vehicle successfully",
      data: vehicleMapping
    });

  } catch (error) {
    await session.abortTransaction();

    console.error("Assign Vehicle Mapping Error:", error);

    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error"
    });
  } finally {
    session.endSession();
  }
};


exports.getActiveMappings = async (req, res) => {
    try {
        const filter = { unassignedAt: null };

        if (req.user.role !== "superadmin") {
            filter.organizationId = req.orgId;
        }

        const mappings = await VehicleMapping.find(filter)
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        
        return res.status(200).json({
            status: true,
            message: "Active Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        console.error("Get Active Mappings Error:", error);
        return res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        if (!mongoose.isValidObjectId(vehicleId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid vehicle ID"
            });
        }

        const filter = { vehicleId };

        if (req.user.role !== "superadmin") {
            filter.organizationId = req.orgId;
        }

        const mappings = await VehicleMapping.find(filter)
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        
        return res.status(200).json({
            status: true,
            message: "Vehicle Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        console.error("Get By Vehicle Error:", error);
        return res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
};

exports.getByDevice = async (req, res) => {
    try {
        const { gpsDeviceId } = req.params;

        if (!mongoose.isValidObjectId(gpsDeviceId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid GPS device ID"
            });
        }

        const filter = { gpsDeviceId };

        if (req.user.role !== "superadmin") {
            filter.organizationId = req.orgId;
        }

        const mappings = await VehicleMapping.find(filter)
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        
        return res.status(200).json({
            status: true,
            message: "Device Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        console.error("Get By Device Error:", error);
        return res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
};

exports.unassign = async (req, res) => {
    try {
        const { vehicleId, gpsDeviceId, organizationId } = req.body;

        // Validate required fields
        if (!vehicleId || !gpsDeviceId || !organizationId) {
            return res.status(400).json({
                status: false,
                message: "vehicleId, gpsDeviceId, and organizationId are required"
            });
        }

        // Validate ObjectIds
        if (!mongoose.isValidObjectId(vehicleId) || !mongoose.isValidObjectId(gpsDeviceId) || !mongoose.isValidObjectId(organizationId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid vehicle ID, GPS device ID, or organization ID"
            });
        }

        // Verify organizationId belongs to user
        if (req.user.role !== "superadmin" && organizationId !== req.orgId.toString()) {
            return res.status(403).json({
                status: false,
                message: "Forbidden: Cannot unassign devices from other organizations"
            });
        }

        const mapping = await VehicleMapping.findOneAndUpdate(
            { 
                organizationId,
                vehicleId, 
                gpsDeviceId, 
                unassignedAt: null 
            },
            { unassignedAt: new Date() },
            { new: true }
        ).populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');

        if (!mapping) {
            return res.status(404).json({ 
                status: false, 
                message: "Active mapping not found" 
            });
        }

        return res.status(200).json({ 
            status: true, 
            message: "Device Unassigned from Vehicle", 
            data: mapping 
        });
    } catch (error) {
        console.error("Unassign Vehicle Mapping Error:", error);
        return res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
};
