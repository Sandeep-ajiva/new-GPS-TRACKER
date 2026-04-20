require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../Modules/users/model");

const MONGO_URI = process.env.MONGO_URI;

(async () => {
    try {
        console.log("Connecting to DB:", MONGO_URI);

        const email = process.env.SUPERADMIN_EMAIL || "superadmin@gmail.com";
        const password = process.env.SUPERADMIN_PASSWORD || "admin@123";

        const existing = await User.findOne({ email });
        if (existing) {
            console.log("Super Admin already exists:", existing.email);
            process.exit();
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const superAdmin = new User({
            firstName: "Super",
            lastName: "Admin",
            email: email,
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
