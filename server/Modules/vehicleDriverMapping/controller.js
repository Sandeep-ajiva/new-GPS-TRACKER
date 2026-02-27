const VehicleDriverMapping = require('./model');
const Vehicle = require('../vehicle/model');
const Driver = require('../drivers/model');
const Validator = require('../../helpers/validators');
const mongoose = require('mongoose');

const validateAssignData = async (data) => {
  const rules = {
    vehicleId: "required|string",
    driverId: "required|string"
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateUnassignData = async (data) => {
  const rules = {
    vehicleId: "required|string"
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

// Assign driver to vehicle (only one active driver per vehicle)
exports.assignDriverToVehicle = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await validateAssignData(req.body);

    const { vehicleId, driverId } = req.body;
    const orgScope = req.orgScope;

    if (!orgScope) {
      throw { status: 400, message: "Organization scope missing" };
    }

    if (!mongoose.isValidObjectId(vehicleId) || !mongoose.isValidObjectId(driverId)) {
      throw { status: 400, message: "Invalid vehicleId or driverId" };
    }

    const orgFilter =
      orgScope === "ALL"
        ? { $exists: true }
        : { $in: orgScope };

    // 🔍 Fetch vehicle
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      organizationId: orgFilter
    }).session(session);

    if (!vehicle) {
      throw { status: 404, message: "Vehicle not found or not in organization" };
    }

    // 🔍 Fetch driver
    const driver = await Driver.findOne({
      _id: driverId,
      organizationId: orgFilter
    }).session(session);

    if (!driver) {
      throw { status: 404, message: "Driver not found or not in organization" };
    }

    // 🚫 Driver already assigned to another vehicle
    const activeDriverMapping = await VehicleDriverMapping.findOne({
      driverId,
      unassignedAt: null
    }).session(session);

    if (activeDriverMapping) {
      throw { status: 409, message: "Driver already assigned to another vehicle" };
    }

    // 🔄 Unassign existing driver from vehicle
    await VehicleDriverMapping.updateOne(
      {
        vehicleId,
        unassignedAt: null
      },
      {
        unassignedAt: new Date(),
        status: "unassigned"
      },
      { session }
    );

    // 🧩 Create new mapping
    const mapping = await VehicleDriverMapping.create(
      [{
        organizationId: vehicle.organizationId,
        vehicleId,
        driverId,
        assignedAt: new Date(),
        unassignedAt: null,
        status: "assigned"
      }],
      { session }
    );

    // 🔄 Sync cache fields
    vehicle.driverId = driverId;
    driver.assignedVehicleId = vehicleId;

    await vehicle.save({ session });
    await driver.save({ session });

    await session.commitTransaction();

    await mapping[0].populate(["vehicleId", "driverId"]);

    return res.status(201).json({
      status: true,
      message: "Driver assigned to vehicle successfully",
      data: {
        mappingId: mapping[0]._id,
        vehicleNumber: mapping[0].vehicleId.vehicleNumber,
        driverName: `${mapping[0].driverId.firstName} ${mapping[0].driverId.lastName}`,
        assignedAt: mapping[0].assignedAt
      }
    });

  } catch (error) {
    await session.abortTransaction();

    console.error("Assign Driver Error:", error);

    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error"
    });
  } finally {
    session.endSession();
  }
};


// Unassign driver from vehicle
exports.unassignDriverFromVehicle = async (req, res) => {
  try {
    await validateUnassignData(req.body);

    const { vehicleId } = req.body;

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { organizationId: { $in: req.orgScope } };
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ...orgFilter });
    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or access denied"
      });
    }

    // Find active mapping
    const activeMapping = await VehicleDriverMapping.findOne({
      vehicleId,
      unassignedAt: null,
      status: "assigned"
    });

    if (!activeMapping) {
      return res.status(404).json({
        status: false,
        message: "No active driver assignment found for this vehicle"
      });
    }

    // Unassign
    activeMapping.unassignedAt = new Date();
    activeMapping.status = "unassigned";
    await activeMapping.save();

    // Clear denormalized cache fields
    await Vehicle.findByIdAndUpdate(vehicleId, { driverId: null });
    await Driver.findByIdAndUpdate(activeMapping.driverId, { assignedVehicleId: null });

    await activeMapping.populate(['vehicleId', 'driverId']);

    return res.status(200).json({
      status: true,
      message: "Driver unassigned from vehicle successfully",
      data: {
        _id: activeMapping._id,
        vehicleId: activeMapping.vehicleId._id,
        vehicleName: activeMapping.vehicleId.vehicleNumber,
        driverId: activeMapping.driverId._id,
        driverName: `${activeMapping.driverId.firstName} ${activeMapping.driverId.lastName}`,
        assignedAt: activeMapping.assignedAt,
        unassignedAt: activeMapping.unassignedAt,
        status: activeMapping.status
      }
    });
  } catch (error) {
    console.error("Unassign Driver Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error"
    });
  }
};

// Get current driver assigned to vehicle
exports.getCurrentDriverByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { organizationId: { $in: req.orgScope } };
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ...orgFilter });
    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or access denied"
      });
    }

    // Find active driver assignment
    const activeMapping = await VehicleDriverMapping.findOne({
      vehicleId,
      unassignedAt: null,
      status: "assigned"
    }).populate(['vehicleId', 'driverId']);

    if (!activeMapping) {
      return res.status(200).json({
        status: true,
        message: "No active driver assigned to this vehicle",
        data: null
      });
    }

    return res.status(200).json({
      status: true,
      message: "Current driver fetched successfully",
      data: {
        _id: activeMapping._id,
        vehicleId: activeMapping.vehicleId._id,
        vehicleName: activeMapping.vehicleId.vehicleNumber,
        driverId: activeMapping.driverId._id,
        driverName: `${activeMapping.driverId.firstName} ${activeMapping.driverId.lastName}`,
        driverEmail: activeMapping.driverId.email,
        driverPhone: activeMapping.driverId.phone,
        driverStatus: activeMapping.driverId.status,
        assignedAt: activeMapping.assignedAt,
        status: activeMapping.status
      }
    });
  } catch (error) {
    console.error("Get Current Driver Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error"
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filter = { unassignedAt: null };

    if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }

    const mappings = await VehicleDriverMapping.find(filter)
      .populate('organizationId', 'name')
      .populate('vehicleId')
      .populate('driverId');

    return res.status(200).json({
      status: true,
      data: mappings
    });
  } catch (error) {
    console.error("Get All Mappings Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
