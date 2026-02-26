require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../Modules/users/model');

const MONGO_URI = process.env.MONGO_URI

async function seedSuperAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'superadmin@gmail.com';
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log('Super Admin already exists');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash('admin@123', 10);

        const superAdmin = new User({
            firstName: 'Super',
            lastName: 'Admin',
            email: email,
            mobile: '1234567890',
            passwordHash: passwordHash,
            role: 'superadmin',
            status: 'active',
            organizationId: null
        });

        await superAdmin.save();
        console.log('Super Admin created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding Super Admin:', error);
        process.exit(1);
    }
}

seedSuperAdmin();
