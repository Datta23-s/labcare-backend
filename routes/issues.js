const router = require('express').Router();
const issueController = require('../controllers/issueController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// POST /api/v1/issues — Report issue (all authenticated users)
router.post('/', upload.single('image'), issueController.createIssue);

// GET /api/v1/issues — Get issues (role-filtered)
router.get('/', issueController.getIssues);

// GET /api/v1/issues/:id — Get single issue
router.get('/:id', issueController.getIssueById);

// PUT /api/v1/issues/:id/status — Update status (lab_assistant/admin)
router.put('/:id/status', roleGuard('lab_assistant', 'admin'), issueController.updateIssueStatus);

// DELETE /api/v1/issues/:id — Delete (admin only)
router.delete('/:id', roleGuard('admin'), issueController.deleteIssue);

module.exports = router;
