const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

// Public endpoints for demo UI (no auth)
router.get('/pending', visitController.getPendingVisits);
router.put('/:id/approve', visitController.approveVisitPublic);
router.put('/:id/reject', visitController.rejectVisitPublic);

module.exports = router;
