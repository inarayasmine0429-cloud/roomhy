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

// Update owner by loginId (PATCH for password updates)
router.patch('/:loginId', async (req, res) => {
    try {
        console.log('✏️ Owner PATCH request for:', req.params.loginId, 'payload:', JSON.stringify(req.body));
        console.log('📌 Database: checking if owner exists before update...');
        
        // First check if owner exists
        const existingOwner = await Owner.findOne({ loginId: req.params.loginId });
        if (!existingOwner) {
            console.log('⚠️ PATCH: Owner not found for update:', req.params.loginId);
            return res.status(404).json({ error: 'Owner not found for update', loginId: req.params.loginId });
        }
        console.log('✅ PATCH: Found existing owner, current state:', JSON.stringify(existingOwner, null, 2));
        
        // Now update it
        const owner = await Owner.findOneAndUpdate(
            { loginId: req.params.loginId },
            { $set: req.body },
            { new: true }
        );
        
        if (!owner) {
            console.error('❌ PATCH: findOneAndUpdate returned null (should not happen)');
            return res.status(500).json({ error: 'Update failed to return document' });
        }
        
        console.log('✅ PATCH: Owner updated successfully. New state:', JSON.stringify(owner, null, 2));
        res.json(owner);
    } catch (err) {
        console.error('❌ Owner PATCH error:', err.message, err.code);
        res.status(500).json({ error: err.message, errorCode: err.code });
    }
});

module.exports = router;
