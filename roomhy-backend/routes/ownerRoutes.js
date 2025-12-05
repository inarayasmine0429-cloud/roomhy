const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');

// Create new owner (from enquiry approval)
router.post('/', async (req, res) => {
    try {
        console.log('📝 Owner POST request:', req.body);
        const owner = new Owner(req.body);
        await owner.save();
        console.log('✅ Owner created:', owner.loginId);
        res.status(201).json(owner);
    } catch (err) {
        console.error('❌ Owner POST error:', err.message);
        if (err.code === 11000) {
            // Duplicate key error
            res.status(400).json({ error: 'Owner ID already exists', code: 'DUPLICATE' });
        } else {
            res.status(400).json({ error: err.message });
        }
    }
});

// Get owner by loginId
router.get('/:loginId', async (req, res) => {
    try {
        console.log('🔍 Owner GET request for:', req.params.loginId);
        console.log('📌 Searching in database...');
        const owner = await Owner.findOne({ loginId: req.params.loginId });
        if (!owner) {
            console.log('⚠️ Owner not found in DB for loginId:', req.params.loginId);
            // Also check if there are any owners at all
            const allOwners = await Owner.find({});
            console.log('📊 Total owners in DB:', allOwners.length);
            if (allOwners.length > 0) {
                console.log('🔎 First few owners:', allOwners.slice(0, 3).map(o => ({ loginId: o.loginId, id: o._id })));
            }
            return res.status(404).json({ error: 'Owner not found', loginId: req.params.loginId });
        }
        console.log('✅ Owner found:', owner.loginId, 'with ID:', owner._id);
        res.json(owner);
    } catch (err) {
        console.error('❌ Owner GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update owner profile by loginId
router.put('/:loginId/profile', async (req, res) => {
    try {
        console.log('📝 Owner PUT profile request for:', req.params.loginId, 'payload:', JSON.stringify(req.body));
        
        const updatePayload = {
            profile: {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                updatedAt: new Date()
            },
            profileFilled: true,
            updatedAt: new Date()
        };

        const owner = await Owner.findOneAndUpdate(
            { loginId: req.params.loginId },
            { $set: updatePayload },
            { new: true }
        );

        if (!owner) {
            console.log('⚠️ Owner not found for profile update:', req.params.loginId);
            return res.status(404).json({ error: 'Owner not found' });
        }

        console.log('✅ Owner profile updated:', owner.loginId);
        res.json(owner);
    } catch (err) {
        console.error('❌ Owner profile update error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update owner KYC by loginId
router.put('/:loginId/kyc', async (req, res) => {
    try {
        console.log('📝 Owner PUT KYC request for:', req.params.loginId);
        
        const updatePayload = {
            kyc: {
                status: 'submitted',
                aadharNumber: req.body.aadharNumber,
                documentImage: req.body.documentImage,
                submittedAt: new Date()
            },
            profileFilled: true, // Ensure profile is marked as filled
            updatedAt: new Date()
        };

        const owner = await Owner.findOneAndUpdate(
            { loginId: req.params.loginId },
            { $set: updatePayload },
            { new: true }
        );

        if (!owner) {
            console.log('⚠️ Owner not found for KYC update:', req.params.loginId);
            return res.status(404).json({ error: 'Owner not found' });
        }

        console.log('✅ Owner KYC submitted:', owner.loginId);
        res.json(owner);
    } catch (err) {
        console.error('❌ Owner KYC update error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
