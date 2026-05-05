const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  resultsPublic: {
    type: Boolean,
    default: false
  },
  votingOpen: {
    type: Boolean,
    default: true
  },
  subject: {
    type: String,
    default: 'Organizational Behavior',
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
