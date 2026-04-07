const router = require('express').Router();
const labController = require('../controllers/labController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.use(authenticate);

router.get('/', labController.getLabs);
router.get('/:id', labController.getLabById);
router.post('/', roleGuard('admin'), labController.createLab);
router.put('/:id', roleGuard('admin'), labController.updateLab);
router.delete('/:id', roleGuard('admin'), labController.deleteLab);

module.exports = router;
