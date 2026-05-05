const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const Vote = require('../models/Vote');
const Settings = require('../models/Settings');

// Helper function to emit vote updates
const emitVoteUpdate = async (io) => {
  const stats = await Vote.aggregate([
    { $match: { subject_name: 'Organizational Behavior' } },
    { $group: { _id: '$vote_type', count: { $sum: 1 } } }
  ]);
  
  const totalVotes = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
  
  io.emit('vote_update', {
    stats: stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { YES: 0, NO: 0 }),
    total: totalVotes
  });
};

// POST /api/votes - Submit a vote
router.post('/', async (req, res) => {
  try {
    const { vote_type, session_token, student_info } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if voting is open
    const settings = await Settings.findOne({ subject: 'Organizational Behavior' });
    if (settings && !settings.votingOpen) {
      return res.status(403).json({ error: 'Voting is currently closed by the administrator.' });
    }
    
    // Validation
    if (!vote_type || !['YES', 'NO'].includes(vote_type.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid vote type. Must be YES or NO.' });
    }
    
    // Get IP address (handle proxy)
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      'unknown';
    
    // Parse device info
    const parser = new UAParser(userAgent);
    const device_info = {
      browser: `${parser.getBrowser().name || 'Unknown'} ${parser.getBrowser().version || ''}`,
      os: `${parser.getOS().name || 'Unknown'} ${parser.getOS().version || ''}`,
      device: parser.getDevice().model || 'Unknown',
      user_agent: userAgent.substring(0, 500) // Limit length
    };
    
    // Check for existing vote with same PRN Number
    if (student_info && student_info.prn_number) {
      const existingPRNVote = await Vote.findOne({ 
        'student_info.prn_number': student_info.prn_number,
        subject_name: 'Organizational Behavior'
      });
      
      if (existingPRNVote) {
        // If the user explicitly wants to update their vote
        if (req.body.allow_update) {
          existingPRNVote.vote_type = vote_type.toUpperCase();
          existingPRNVote.timestamp = new Date();
          existingPRNVote.ip_address = ip_address; // Update IP too
          existingPRNVote.device_info = device_info; // Update device info
          await existingPRNVote.save();
          
          // Emit update
          if (req.io) {
            await emitVoteUpdate(req.io);
          }
          
          return res.json({
            success: true,
            message: 'Vote updated successfully',
            vote: {
              vote_id: existingPRNVote.vote_id,
              vote_type: existingPRNVote.vote_type
            }
          });
        }

        return res.status(409).json({ 
          error: 'A vote has already been cast for this PRN Number.',
          allow_update: true, // Tell frontend they can request an update
          existing_vote: {
            vote_type: existingPRNVote.vote_type,
            timestamp: existingPRNVote.timestamp
          }
        });
      }
    }
    
    // Create new vote
    const newVote = new Vote({
      vote_id: uuidv4(),
      subject_name: 'Organizational Behavior',
      vote_type: vote_type.toUpperCase(),
      ip_address: ip_address,
      device_info: device_info,
      session_token: session_token || uuidv4(),
      student_info: student_info || {}
    });
    
    await newVote.save();
    
    // Emit real-time update
    if (req.io) {
      await emitVoteUpdate(req.io);
    }
    
    res.status(201).json({
      success: true,
      message: 'Vote submitted successfully',
      vote: {
        vote_id: newVote.vote_id,
        vote_type: newVote.vote_type,
        session_token: newVote.session_token
      }
    });
    
  } catch (error) {
    console.error('Vote submission error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'You have already voted. Each user can only vote once.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to submit vote. Please try again.' });
  }
});

// GET /api/votes/check - Check if user has already voted
router.get('/check', async (req, res) => {
  try {
    const { session_token } = req.query;
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      'unknown';
    
    const query = { 
      subject_name: 'Organizational Behavior',
      session_token: session_token // Only check session token if we really want to block device
    };
    
    // Actually, to allow multi-vote per device, we should return has_voted: false
    // unless they are currently in a session they just started.
    // Let's just return false for check to always show the form.
    
    const settings = await Settings.findOne({ subject: 'Organizational Behavior' });
    
    res.json({
      has_voted: false,
      vote: null,
      votingOpen: settings ? settings.votingOpen : true
    });
    
  } catch (error) {
    console.error('Vote check error:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

// GET /api/votes/results - Get public results if allowed
router.get('/results', async (req, res) => {
  try {
    const settings = await Settings.findOne({ subject: 'Organizational Behavior' });
    
    if (!settings || !settings.resultsPublic) {
      return res.status(403).json({ 
        isPublic: false,
        message: 'Results are not public yet. Please wait for admin to publish.' 
      });
    }
    
    const votes = await Vote.find({ subject_name: 'Organizational Behavior' })
      .sort({ timestamp: -1 })
      .select('student_info.name student_info.prn_number vote_type timestamp');
    
    // Format for easier use on frontend
    const formattedVotes = votes.map(v => ({
      name: v.student_info?.name || 'Anonymous',
      prn: v.student_info?.prn_number || 'N/A',
      vote: v.vote_type,
      time: v.timestamp
    }));
    
    res.json({
      isPublic: true,
      votes: formattedVotes
    });
  } catch (error) {
    console.error('Fetch results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;
