const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Approve visit report and create property + owner
router.post('/visits/:id/approve', adminController.approveVisit);

module.exports = router;
