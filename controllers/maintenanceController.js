const { MaintenanceLog, Lab, User } = require('../models');
const { Op } = require('sequelize');

// GET /api/v1/maintenance
exports.getMaintenanceLogs = async (req, res) => {
  try {
    const { lab_id, type, date_from, date_to, page = 1, limit = 20 } = req.query;
    const where = {};

    if (lab_id) where.lab_id = lab_id;
    if (type) where.type = type;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await MaintenanceLog.findAndCountAll({
      where,
      include: [
        { model: Lab, as: 'lab', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      logs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get maintenance logs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/v1/maintenance
exports.createMaintenanceLog = async (req, res) => {
  try {
    const { lab_id, type, description, performed_by, date, cost } = req.body;

    if (!lab_id || !type || !description || !performed_by || !date) {
      return res.status(400).json({ message: 'lab_id, type, description, performed_by, and date are required.' });
    }

    const log = await MaintenanceLog.create({
      lab_id,
      type,
      description,
      performed_by,
      date,
      cost: cost || 0,
      created_by: req.user.id
    });

    const fullLog = await MaintenanceLog.findByPk(log.id, {
      include: [
        { model: Lab, as: 'lab', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ message: 'Maintenance log created.', log: fullLog });
  } catch (error) {
    console.error('Create maintenance log error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/maintenance/:id
exports.updateMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found.' });

    const fields = ['lab_id', 'type', 'description', 'performed_by', 'date', 'cost'];
    fields.forEach(f => { if (req.body[f] !== undefined) log[f] = req.body[f]; });

    await log.save();
    res.json({ message: 'Maintenance log updated.', log });
  } catch (error) {
    console.error('Update maintenance log error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/v1/maintenance/:id
exports.deleteMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found.' });

    await log.destroy();
    res.json({ message: 'Maintenance log deleted.' });
  } catch (error) {
    console.error('Delete maintenance log error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/v1/maintenance/export — Export CSV
exports.exportCSV = async (req, res) => {
  try {
    const { lab_id, type, date_from, date_to } = req.query;
    const where = {};

    if (lab_id) where.lab_id = lab_id;
    if (type) where.type = type;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const logs = await MaintenanceLog.findAll({
      where,
      include: [
        { model: Lab, as: 'lab', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ],
      order: [['date', 'DESC']],
      raw: true,
      nest: true
    });

    // Build CSV
    const headers = ['ID', 'Lab', 'Type', 'Description', 'Performed By', 'Date', 'Cost', 'Created By'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      csvRows.push([
        log.id,
        `"${log.lab?.name || ''}"`,
        log.type,
        `"${log.description?.replace(/"/g, '""') || ''}"`,
        `"${log.performed_by || ''}"`,
        log.date,
        log.cost || 0,
        `"${log.creator?.name || ''}"`
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=maintenance_logs.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
