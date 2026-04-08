const router = require('express').Router();
const pcController = require('../controllers/pcController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.use(authenticate);

// Get all PCs for a lab (any role — students see read-only)
router.get('/labs/:labId/pcs', pcController.getPCsByLab);

// Update a single PC (admin + lab_assistant only)
router.put('/pcs/:id', roleGuard('admin', 'lab_assistant'), pcController.updatePC);

// Bulk update PCs in a lab (admin + lab_assistant only)
router.put('/labs/:labId/pcs/bulk', roleGuard('admin', 'lab_assistant'), pcController.bulkUpdatePCs);

// Global PC stats (admin only)
router.get('/pcs/stats', roleGuard('admin'), pcController.getPCStats);

module.exports = router;
