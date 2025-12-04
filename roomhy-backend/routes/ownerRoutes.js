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
        const owner = await Owner.findOne({ loginId: req.params.loginId });
        if (!owner) {
            console.log('⚠️ Owner not found:', req.params.loginId);
            return res.status(404).json({ error: 'Owner not found' });
        }
        console.log('✅ Owner found:', owner.loginId);
        res.json(owner);
    } catch (err) {
        console.error('❌ Owner GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
