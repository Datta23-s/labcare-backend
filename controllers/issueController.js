const { Op } = require('sequelize');
const { Issue, User, Lab, PC } = require('../models');
const { generateTicketId } = require('../services/ticketService');
const { sendNotification } = require('../services/socketService');
const { updateLabPCCounts } = require('./pcController');
const { sendIssueUpdateEmail } = require('../services/emailService');

// POST /api/v1/issues — Report a new issue
exports.createIssue = async (req, res) => {
  try {
    const { lab_id, type, priority, description, pc_number } = req.body;

    if (!lab_id || !type || !description) {
      return res.status(400).json({ message: 'lab_id, type, and description are required.' });
    }

    const ticket_id = await generateTicketId();
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const issue = await Issue.create({
      ticket_id,
      student_id: req.user.id,
      lab_id,
      type,
      priority: priority || 'medium',
      description,
      image_url,
      status: 'open',
      pc_number: pc_number || null
    });

    // Auto-update PC status if pc_number is provided
    if (pc_number) {
      const pc = await PC.findOne({ where: { lab_id, pc_number } });
      if (pc) {
        pc.status = 'not_working';
        pc.problem = description;
        pc.last_reported_by = req.user.id;
        await pc.save();
        await updateLabPCCounts(lab_id);
      }
    }

    // Notify lab assistant if assigned to this lab
    const lab = await Lab.findByPk(lab_id);
    if (lab && lab.assigned_assistant) {
      await sendNotification(lab.assigned_assistant, {
        title: 'New Issue Reported',
        message: `Issue ${ticket_id} reported in ${lab.name}${pc_number ? ' (' + pc_number + ')' : ''}: ${description.substring(0, 100)}`,
        type: 'assignment',
        link: `/issues/${issue.id}`
      });
    }

    const fullIssue = await Issue.findByPk(issue.id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ message: 'Issue reported successfully.', issue: fullIssue });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/v1/issues — Get issues (filtered by role)
exports.getIssues = async (req, res) => {
  try {
    const { status, type, priority, lab_id, search, page = 1, limit = 20 } = req.query;
    const where = {};

    // Students see only their issues
    if (req.user.role === 'student') {
      where.student_id = req.user.id;
    }

    // Lab assistants see issues for their assigned labs
    if (req.user.role === 'lab_assistant' && req.user.lab_id) {
      // They can see all issues, but we could filter by lab
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (lab_id) where.lab_id = lab_id;

    if (search) {
      where[Op.or] = [
        { ticket_id: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Issue.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      issues: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/v1/issues/:id — Get single issue
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name', 'building', 'floor'] }
      ]
    });

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    // Students can only see their own issues
    if (req.user.role === 'student' && issue.student_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ issue });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/issues/:id/status — Update issue status (lab_assistant/admin)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, remarks, assigned_to } = req.body;
    const issue = await Issue.findByPk(req.params.id, {
      include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }]
    });

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    if (status) issue.status = status;
    if (remarks) issue.remarks = remarks;
    if (assigned_to) issue.assigned_to = assigned_to;

    await issue.save();

    // Notify the student who reported it
    if (status && issue.reporter) {
      await sendNotification(issue.student_id, {
        title: 'Issue Status Updated',
        message: `Your issue ${issue.ticket_id} is now "${status}".${remarks ? ' Remarks: ' + remarks : ''}`,
        type: 'issue_update',
        link: `/issues/${issue.id}`
      });

      // Send email notification
      if (issue.reporter.email) {
        await sendIssueUpdateEmail(issue.reporter.email, issue.ticket_id, status, remarks);
      }
    }

    const updatedIssue = await Issue.findByPk(issue.id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name'] }
      ]
    });

    res.json({ message: 'Issue updated.', issue: updatedIssue });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/v1/issues/:id — Delete issue (admin only)
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    await issue.destroy();
    res.json({ message: 'Issue deleted.' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
