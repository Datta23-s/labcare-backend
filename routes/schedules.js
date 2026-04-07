const router = require('express').Router();
const scheduleController = require('../controllers/scheduleController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.use(authenticate);

router.get('/', scheduleController.getSchedules);
router.post('/', roleGuard('admin', 'lab_assistant'), scheduleController.createSchedule);
router.put('/:id', roleGuard('admin', 'lab_assistant'), scheduleController.updateSchedule);
router.delete('/:id', roleGuard('admin'), scheduleController.deleteSchedule);

module.exports = router;
