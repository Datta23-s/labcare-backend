const { PC, Lab, User } = require('../models');

// GET /api/v1/labs/:labId/pcs — get all PCs for a lab
exports.getPCsByLab = async (req, res) => {
  try {
    const { labId } = req.params;
    const lab = await Lab.findByPk(labId, {
      include: [{ model: User, as: 'assistant', attributes: ['id', 'name'] }]
    });
    if (!lab) return res.status(404).json({ message: 'Lab not found.' });

    // We now allow lab_assistants to browse other labs (read-only). 
    // updatePC will independently block them from editing other labs.

    const pcs = await PC.findAll({
      where: { lab_id: labId },
      include: [
        { model: User, as: 'lastReporter', attributes: ['id', 'name'] },
        { model: User, as: 'lastUpdater', attributes: ['id', 'name'] }
      ],
      order: [['pc_number', 'ASC']]
    });

    const workingCount = pcs.filter(p => p.status === 'working').length;
    const notWorkingCount = pcs.filter(p => p.status === 'not_working').length;
    const maintenanceCount = pcs.filter(p => p.status === 'under_maintenance').length;

    res.json({
      lab: {
        id: lab.id,
        name: lab.name,
        floor: lab.floor,
        building: lab.building,
        assistant: lab.assistant
      },
      summary: {
        total: pcs.length,
        working: workingCount,
        not_working: notWorkingCount,
        under_maintenance: maintenanceCount
      },
      pcs
    });
  } catch (error) {
    console.error('Get PCs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/pcs/:id — update a single PC status
exports.updatePC = async (req, res) => {
  try {
    const pc = await PC.findByPk(req.params.id, {
      include: [{ model: Lab, as: 'lab' }]
    });
    if (!pc) return res.status(404).json({ message: 'PC not found.' });

    // Lab assistant can only update PCs in their lab
    if (req.user.role === 'lab_assistant' && req.user.lab_id !== pc.lab_id) {
      return res.status(403).json({ message: 'Access denied. You can only update PCs in your assigned lab.' });
    }

    const { status, problem } = req.body;
    if (status) pc.status = status;
    if (status === 'working') {
      pc.problem = null;
    } else if (problem !== undefined) {
      pc.problem = problem;
    }
    pc.last_updated_by = req.user.id;

    await pc.save();

    // Update lab cached counts
    await updateLabPCCounts(pc.lab_id);

    res.json({ message: 'PC updated.', pc });
  } catch (error) {
    console.error('Update PC error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/labs/:labId/pcs/bulk — bulk update PCs in a lab
exports.bulkUpdatePCs = async (req, res) => {
  try {
    const { labId } = req.params;
    const lab = await Lab.findByPk(labId);
    if (!lab) return res.status(404).json({ message: 'Lab not found.' });

    // Lab assistant can only update their own lab
    if (req.user.role === 'lab_assistant' && req.user.lab_id !== lab.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { updates } = req.body;
    // updates is an array of { pc_id, status, problem }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided.' });
    }

    for (const update of updates) {
      const pc = await PC.findOne({ where: { id: update.pc_id, lab_id: labId } });
      if (pc) {
        pc.status = update.status || pc.status;
        if (pc.status === 'working') {
          pc.problem = null;
        } else if (update.problem !== undefined) {
          pc.problem = update.problem;
        }
        pc.last_updated_by = req.user.id;
        await pc.save();
      }
    }

    await updateLabPCCounts(labId);

    const pcs = await PC.findAll({
      where: { lab_id: labId },
      order: [['pc_number', 'ASC']]
    });

    res.json({ message: 'PCs updated.', pcs });
  } catch (error) {
    console.error('Bulk update PCs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/v1/pcs/stats — global PC stats (admin only)
exports.getPCStats = async (req, res) => {
  try {
    const labs = await Lab.findAll({
      attributes: ['id', 'name', 'floor', 'building', 'total_pcs', 'working_pcs', 'not_working_pcs'],
      include: [{ model: User, as: 'assistant', attributes: ['id', 'name'] }],
      order: [['floor', 'ASC'], ['name', 'ASC']]
    });

    // Group by floor
    const floorMap = {};
    labs.forEach(lab => {
      const floor = lab.floor || 'Unknown';
      if (!floorMap[floor]) {
        floorMap[floor] = { floor, labs: [], totalPCs: 0, working: 0, notWorking: 0 };
      }
      floorMap[floor].labs.push(lab);
      floorMap[floor].totalPCs += lab.total_pcs;
      floorMap[floor].working += lab.working_pcs;
      floorMap[floor].notWorking += lab.not_working_pcs;
    });

    const floors = Object.values(floorMap);
    const totalPCs = floors.reduce((s, f) => s + f.totalPCs, 0);
    const totalWorking = floors.reduce((s, f) => s + f.working, 0);
    const totalNotWorking = floors.reduce((s, f) => s + f.notWorking, 0);

    res.json({
      totalPCs,
      totalWorking,
      totalNotWorking,
      floors
    });
  } catch (error) {
    console.error('PC stats error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Helper: recalculate and cache lab PC counts
const updateLabPCCounts = async (labId) => {
  const working = await PC.count({ where: { lab_id: labId, status: 'working' } });
  const notWorking = await PC.count({ where: { lab_id: labId, status: 'not_working' } });
  const total = await PC.count({ where: { lab_id: labId } });
  await Lab.update(
    { total_pcs: total, working_pcs: working, not_working_pcs: notWorking },
    { where: { id: labId } }
  );
};

// Export the helper for use in issue controller
exports.updateLabPCCounts = updateLabPCCounts;
