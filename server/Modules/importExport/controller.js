const ImportExportService = require("./service");

exports.importData = async (req, res) => {
  try {

    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: insufficient role",
      });
    }

    const { entity } = req.params;
    const result = await ImportExportService.importData({
      entity: (entity || "").toLowerCase(),
      file: req.file,
      req,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Import failed",
      data: error.data || null,
    });
  }
};

exports.exportData = async (req, res) => {
  try {
    if (!["admin", "superadmin", "driver"].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: insufficient role",
      });
    }

    const { entity } = req.params;
    await ImportExportService.exportData({
      entity: (entity || "").toLowerCase(),
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.status || 500).json({
        status: false,
        message: error.message || "Export failed",
      });
    }
    return null;
  }
};
