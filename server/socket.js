const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

const User = require("./Modules/users/model");
const Organization = require("./Modules/organizations/model");
const GpsDevice = require("./Modules/gpsDevice/model");
const { corsOptions } = require("./config/security");

let io;
const JWT_SECRET = process.env.JWT_SECRET;

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildOrganizationScope = async (user) => {
  if (user.role === "superadmin") {
    return "ALL";
  }

  if (!user.organizationId) {
    return [];
  }

  const currentOrg = await Organization.findById(user.organizationId)
    .select("path")
    .lean();

  if (!currentOrg?.path) {
    return [String(user.organizationId)];
  }

  const organizations = await Organization.find({
    path: { $regex: new RegExp(`^${escapeRegex(currentOrg.path)}(/|$)`) },
  })
    .select("_id")
    .lean();

  return organizations.map((organization) => String(organization._id));
};

const hasOrganizationAccess = (organizationId, organizationScope) => {
  if (!organizationId) return false;
  if (organizationScope === "ALL") return true;

  return Array.isArray(organizationScope)
    ? organizationScope.includes(String(organizationId))
    : false;
};

const resolveSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const authorizationHeader = socket.handshake.headers.authorization;
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.split(" ")[1];
  }

  return null;
};

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: corsOptions,
  });

  io.use(async (socket, next) => {
    try {
      if (!JWT_SECRET) {
        return next(new Error("Socket authentication is not configured"));
      }

      const token = resolveSocketToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select("_id role organizationId status assignedVehicleId")
        .lean();

      if (!user || (user.status && user.status !== "active")) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = {
        _id: String(user._id),
        role: user.role,
        organizationId: user.organizationId ? String(user.organizationId) : null,
        assignedVehicleId: user.assignedVehicleId
          ? String(user.assignedVehicleId)
          : null,
      };
      socket.data.organizationScope = await buildOrganizationScope(
        socket.data.user,
      );

      next();
    } catch (_) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_organization", (organizationId, callback) => {
      if (
        !hasOrganizationAccess(organizationId, socket.data.organizationScope)
      ) {
        const payload = {
          status: false,
          message: "Forbidden: organization room access denied",
        };
        socket.emit("socket_error", payload);
        if (typeof callback === "function") callback(payload);
        return;
      }

      socket.join(`org_${organizationId}`);
      if (typeof callback === "function") {
        callback({ status: true });
      }
    });

    socket.on("join_device", async (imei, callback) => {
      try {
        const device = await GpsDevice.findOne({ imei })
          .select("organizationId")
          .lean();

        if (
          !device ||
          !hasOrganizationAccess(
            device.organizationId,
            socket.data.organizationScope,
          )
        ) {
          const payload = {
            status: false,
            message: "Forbidden: device room access denied",
          };
          socket.emit("socket_error", payload);
          if (typeof callback === "function") callback(payload);
          return;
        }

        socket.join(`device_${imei}`);
        if (typeof callback === "function") {
          callback({ status: true });
        }
      } catch (_) {
        if (typeof callback === "function") {
          callback({
            status: false,
            message: "Unable to join device room",
          });
        }
      }
    });

    socket.on("leave_organization", (organizationId) => {
      socket.leave(`org_${organizationId}`);
    });

    socket.on("leave_device", (imei) => {
      socket.leave(`device_${imei}`);
    });

    socket.on("send_gps_data", (data) => {
      const userRole = socket.data.user?.role;
      if (!["admin", "superadmin"].includes(userRole)) {
        socket.emit("socket_error", {
          status: false,
          message: "Forbidden: GPS broadcast is not allowed",
        });
        return;
      }

      if (
        data?.organizationId &&
        !hasOrganizationAccess(data.organizationId, socket.data.organizationScope)
      ) {
        socket.emit("socket_error", {
          status: false,
          message: "Forbidden: organization room access denied",
        });
        return;
      }

      if (data?.imei) {
        io.to(`device_${data.imei}`).emit("gps_update", data);
      }

      if (data?.organizationId) {
        io.to(`org_${data.organizationId}`).emit("gps_update", data);
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initializeSocket, getIo };
