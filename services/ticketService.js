// Generate unique ticket IDs like LAB-00042
let counter = 0;
const { Issue } = require('../models');

const generateTicketId = async () => {
  const lastIssue = await Issue.findOne({
    order: [['id', 'DESC']]
  });

  counter = lastIssue ? lastIssue.id + 1 : 1;
  return `LAB-${String(counter).padStart(5, '0')}`;
};

module.exports = { generateTicketId };
