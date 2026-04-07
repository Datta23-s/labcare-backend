const router = require('express').Router();
const maintenanceController = require('../controllers/maintenanceController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.use(authenticate);

router.get('/export', roleGuard('admin', 'lab_assistant'), maintenanceController.exportCSV);
router.get('/', maintenanceController.getMaintenanceLogs);
router.post('/', roleGuard('admin', 'lab_assistant'), maintenanceController.createMaintenanceLog);
router.put('/:id', roleGuard('admin', 'lab_assistant'), maintenanceController.updateMaintenanceLog);
router.delete('/:id', roleGuard('admin'), maintenanceController.deleteMaintenanceLog);

module.exports = router;
