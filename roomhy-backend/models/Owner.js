const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    loginId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    phone: String,
    address: String,
    locationCode: String,
    profile: {
        name: String,
        email: String,
        phone: String,
        address: String,
        updatedAt: Date
    },
    profileFilled: { type: Boolean, default: false },
    passwordSet: { type: Boolean, default: false },
    credentials: {
        password: String,
        firstTime: { type: Boolean, default: false }
    },
    kyc: {
        status: { type: String, default: 'pending' }, // pending, submitted, verified
        aadharNumber: String,
        documentImage: String, // Base64 or URL
        submittedAt: Date,
        verifiedAt: Date
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Owner', ownerSchema);
