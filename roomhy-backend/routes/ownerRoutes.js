const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');

// Create new owner (from enquiry approval)
router.post('/', async (req, res) => {
    try {
        const owner = new Owner(req.body);
        await owner.save();
        res.status(201).json(owner);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get owner by loginId
router.get('/:loginId', async (req, res) => {
    try {
        const owner = await Owner.findOne({ loginId: req.params.loginId });
        if (!owner) return res.status(404).json({ error: 'Owner not found' });
        res.json(owner);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
