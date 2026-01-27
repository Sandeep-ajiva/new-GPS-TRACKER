const mongoose = require('mongoose');
const User = require('../Modules/users/model');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ngps";

async function fixAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB:", MONGO_URI);

        const email = "admin1@gmail.com";
        const user = await User.findOne({ email });

        if (user) {
            console.log("✅ Admin user exists:", user.email);
            // Optional: reset password if needed, but for now just checking existence is enough to prove the hypothesis.
            // If exists, checks status.
            console.log("User Status:", user.status);
            if (user.status !== "active") {
                console.log("⚠️ User is inactive. Activating...");
                user.status = "active";
                await user.save();
                console.log("✅ User activated.");
            }
        } else {
            console.log("❌ Admin user NOT found. Creating...");
            const passwordHash = await bcrypt.hash("Admin@123", 10);
            const newUser = await User.create({
                firstName: "Admin",
                lastName: "User",
                email: email,
                mobile: "9999999999",
                passwordHash: passwordHash,
                role: "admin",
                status: "active"
            });
            console.log("✅ Admin user created successfully:", newUser.email);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

fixAdmin();
