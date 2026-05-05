const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  vote_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subject_name: {
    type: String,
    required: true,
    default: 'Organizational Behavior'
  },
  vote_type: {
    type: String,
    required: true,
    enum: ['YES', 'NO']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip_address: {
    type: String,
    required: true,
    index: true
  },
  device_info: {
    browser: String,
    os: String,
    device: String,
    user_agent: String
  },
  session_token: {
    type: String,
    index: true
  },
  student_info: {
    seat_number: String,
    name: String,
    prn_number: String
  }
}, {
  timestamps: true
});

// Index for IP address (not unique to allow multiple students on same network)
voteSchema.index({ ip_address: 1, subject_name: 1 });

// Index for quick stats queries
voteSchema.index({ vote_type: 1, timestamp: 1 });

module.exports = mongoose.model('Vote', voteSchema);
