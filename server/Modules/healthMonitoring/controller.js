const HealthMonitoring = require("./model");

const HealthMonitoringController = {
  /**
   * Get latest health by IMEI (ORG SAFE)
   */
  getLatestByImei: async (req, res) => {
    try {
      const { imei } = req.params;
      const { orgScope } = req;

      const orgFilter =
        orgScope === "ALL" ? {} : { organizationId: { $in: orgScope } };

      const data = await HealthMonitoring.findOne({
        imei,
        ...orgFilter,
      })
        .sort({ timestamp: -1 })
        .lean();

      if (!data) {
        return res.status(404).json({
          status: false,
          message: "Health data not found for this IMEI",
        });
      }

      return res.json({
        status: true,
        data,
      });
    } catch (error) {
      console.error("Health getLatestByImei error:", error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  /**
   * Get health history by IMEI (ORG SAFE)
   */
  getHistoryByImei: async (req, res) => {
    try {
      const { imei } = req.params;
      const { from, to, limit = 100 } = req.query;
      const { orgScope } = req;

      const query = { imei };

      if (orgScope !== "ALL") {
        query.organizationId = { $in: orgScope };
      }

      if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
      }

      const data = await HealthMonitoring.find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .lean();

      return res.json({
        status: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("Health getHistoryByImei error:", error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },

  /**
   * Get latest health by Vehicle (ORG SAFE)
   */
  getLatestByVehicle: async (req, res) => {
    try {
      const { vehicleId } = req.params;
      const { orgScope } = req;

      const query = { vehicleId };

      if (orgScope !== "ALL") {
        query.organizationId = { $in: orgScope };
      }

      const data = await HealthMonitoring.findOne(query)
        .sort({ timestamp: -1 })
        .lean();

      if (!data) {
        return res.status(404).json({
          status: false,
          message: "Health data not found for this vehicle",
        });
      }

      return res.json({
        status: true,
        data,
      });
    } catch (error) {
      console.error("Health getLatestByVehicle error:", error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  },
};

module.exports = HealthMonitoringController;
