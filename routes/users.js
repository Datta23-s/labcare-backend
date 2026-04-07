const router = require('express').Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// All routes require admin
router.use(authenticate, roleGuard('admin'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.put('/:id/reset-password', userController.resetPassword);

module.exports = router;
