const { Lab, User } = require('../models');

// GET /api/v1/labs
exports.getLabs = async (req, res) => {
  try {
    const labs = await Lab.findAll({
      include: [
        { model: User, as: 'assistant', attributes: ['id', 'name', 'email'] }
      ],
      order: [['name', 'ASC']]
    });
    res.json({ labs });
  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/v1/labs/:id
exports.getLabById = async (req, res) => {
  try {
    const lab = await Lab.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assistant', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });
    if (!lab) return res.status(404).json({ message: 'Lab not found.' });
    res.json({ lab });
  } catch (error) {
    console.error('Get lab error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/v1/labs
exports.createLab = async (req, res) => {
  try {
    const { name, floor, building, assigned_assistant } = req.body;
    const lab = await Lab.create({ name, floor, building, assigned_assistant });
    res.status(201).json({ message: 'Lab created.', lab });
  } catch (error) {
    console.error('Create lab error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/labs/:id
exports.updateLab = async (req, res) => {
  try {
    const lab = await Lab.findByPk(req.params.id);
    if (!lab) return res.status(404).json({ message: 'Lab not found.' });

    const { name, floor, building, assigned_assistant } = req.body;
    if (name) lab.name = name;
    if (floor !== undefined) lab.floor = floor;
    if (building !== undefined) lab.building = building;
    if (assigned_assistant !== undefined) lab.assigned_assistant = assigned_assistant;

    await lab.save();
    res.json({ message: 'Lab updated.', lab });
  } catch (error) {
    console.error('Update lab error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/v1/labs/:id
exports.deleteLab = async (req, res) => {
  try {
    const lab = await Lab.findByPk(req.params.id);
    if (!lab) return res.status(404).json({ message: 'Lab not found.' });

    await lab.destroy();
    res.json({ message: 'Lab deleted.' });
  } catch (error) {
    console.error('Delete lab error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
