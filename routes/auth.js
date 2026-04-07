const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// POST /api/v1/auth/register
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.register);

// POST /api/v1/auth/login
router.post('/login', authController.login);

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.getProfile);

// PUT /api/v1/auth/profile
router.put('/profile', authenticate, authController.updateProfile);

// PUT /api/v1/auth/password
router.put('/password', authenticate, authController.changePassword);

module.exports = router;
