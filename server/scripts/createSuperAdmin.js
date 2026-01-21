require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../Modules/users/model");

const MONGO_URI = process.env.MONGO_URI;

(async () => {
    try {
        console.log("Connecting to DB:", MONGO_URI);

        await mongoose.connect(MONGO_URI);
        console.log("MongoDB connected");

        const existing = await User.findOne({ role: "superadmin" });
        if (existing) {
            console.log("Super Admin already exists:", existing.email);
            process.exit();
        }

        const passwordHash = await bcrypt.hash("admin@123", 10);

        const superAdmin = new User({
            firstName: "Super",
            lastName: "Admin",
            email: "superadmin@gmail.com",
            mobile: "1234567890",
            passwordHash : passwordHash,
            role: "superadmin",
            status: "active",
            organizationId: null
        });

        await superAdmin.save();
        console.log("Super Admin Created Successfully");

        process.exit();
    } catch (err) {
        console.error("Error creating Super Admin:", err);
        process.exit(1);
    }
})();
