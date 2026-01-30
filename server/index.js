const express = require("express");
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const responseTimeLogger = require("./middleware/responseTimeLogger");
const connectDB = require("./config/database");

connectDB();

const http = require("http");
const { initializeSocket } = require("./socket");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

const modulesPath = path.join(__dirname, "Modules");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseTimeLogger);

// Serve uploaded files as static content
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// auto load all module routes
fs.readdirSync(modulesPath).forEach((folder) => {
  const routePath = path.join(modulesPath, folder, "routes.js");

  if (fs.existsSync(routePath)) {
    const route = require(routePath);

    // 🚨 SAFETY CHECK
    if (typeof route !== "function") {
      console.warn(`❌ Skipped ${folder} → routes.js does not export a router`);
      return;
    }

    app.use(`/api/${folder.toLowerCase()}`, route);
    console.log(`✅ Loaded routes for : /api/${folder.toLowerCase()}`);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Start TCP Server
require("./tcp/server");
