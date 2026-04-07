const { Schedule, Lab, User } = require('../models');
const { Op } = require('sequelize');

// GET /api/v1/schedules
exports.getSchedules = async (req, res) => {
  try {
    const { lab_id, day } = req.query;
    const where = {};

    if (lab_id) where.lab_id = lab_id;
    if (day) where.day = day;

    const schedules = await Schedule.findAll({
      where,
      include: [
        { model: Lab, as: 'lab', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['day', 'ASC'], ['start_time', 'ASC']]
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/v1/schedules
exports.createSchedule = async (req, res) => {
  try {
    const { lab_id, day, start_time, end_time, subject, instructor } = req.body;

    if (!lab_id || !day || !start_time || !end_time || !subject) {
      return res.status(400).json({ message: 'lab_id, day, start_time, end_time, and subject are required.' });
    }

    // Check for time conflicts
    const conflict = await Schedule.findOne({
      where: {
        lab_id,
        day,
        [Op.or]: [
          {
            start_time: { [Op.lt]: end_time },
            end_time: { [Op.gt]: start_time }
          }
        ]
      }
    });

    if (conflict) {
      return res.status(409).json({
        message: 'Schedule conflict detected.',
        conflict: {
          subject: conflict.subject,
          time: `${conflict.start_time} - ${conflict.end_time}`
        }
      });
    }

    const schedule = await Schedule.create({
      lab_id,
      day,
      start_time,
      end_time,
      subject,
      instructor,
      created_by: req.user.id
    });

    const fullSchedule = await Schedule.findByPk(schedule.id, {
      include: [
        { model: Lab, as: 'lab', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ message: 'Schedule created.', schedule: fullSchedule });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/v1/schedules/:id
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });

    const { lab_id, day, start_time, end_time, subject, instructor } = req.body;

    // Check for time conflicts (excluding self)
    if (start_time && end_time && day) {
      const conflict = await Schedule.findOne({
        where: {
          id: { [Op.ne]: schedule.id },
          lab_id: lab_id || schedule.lab_id,
          day: day || schedule.day,
          [Op.or]: [
            {
              start_time: { [Op.lt]: end_time },
              end_time: { [Op.gt]: start_time }
            }
          ]
        }
      });

      if (conflict) {
        return res.status(409).json({
          message: 'Schedule conflict detected.',
          conflict: { subject: conflict.subject, time: `${conflict.start_time} - ${conflict.end_time}` }
        });
      }
    }

    if (lab_id) schedule.lab_id = lab_id;
    if (day) schedule.day = day;
    if (start_time) schedule.start_time = start_time;
    if (end_time) schedule.end_time = end_time;
    if (subject) schedule.subject = subject;
    if (instructor !== undefined) schedule.instructor = instructor;

    await schedule.save();
    res.json({ message: 'Schedule updated.', schedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/v1/schedules/:id
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });

    await schedule.destroy();
    res.json({ message: 'Schedule deleted.' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
