const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const Vote = require('../models/Vote');

// POST /api/votes - Submit a vote
router.post('/', async (req, res) => {
  try {
    const { vote_type, session_token, student_info } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    
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
    
    // Check for existing vote from this IP
    const existingVote = await Vote.findOne({ 
      ip_address: ip_address,
      subject_name: 'Organizational Behavior'
    });
    
    if (existingVote) {
      return res.status(409).json({ 
        error: 'You have already voted. Each user can only vote once.',
        existing_vote: {
          vote_type: existingVote.vote_type,
          timestamp: existingVote.timestamp
        }
      });
    }
    
    // Check for existing vote with same PRN Number
    if (student_info && student_info.prn_number) {
      const existingPRNVote = await Vote.findOne({ 
        'student_info.prn_number': student_info.prn_number,
        subject_name: 'Organizational Behavior'
      });
      
      if (existingPRNVote) {
        return res.status(409).json({ 
          error: 'A vote has already been cast for this PRN Number.',
          existing_vote: {
            vote_type: existingPRNVote.vote_type,
            timestamp: existingPRNVote.timestamp
          }
        });
      }
    }
    
    // Check for existing vote with same session token (if provided)
    if (session_token) {
      const existingSessionVote = await Vote.findOne({ 
        session_token: session_token,
        subject_name: 'Organizational Behavior'
      });
      
      if (existingSessionVote) {
        return res.status(409).json({ 
          error: 'You have already voted from this device.',
          existing_vote: {
            vote_type: existingSessionVote.vote_type,
            timestamp: existingSessionVote.timestamp
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
      const stats = await Vote.aggregate([
        { $match: { subject_name: 'Organizational Behavior' } },
        { $group: { _id: '$vote_type', count: { $sum: 1 } } }
      ]);
      
      const totalVotes = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
      
      req.io.emit('vote_update', {
        stats: stats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, { YES: 0, NO: 0 }),
        total: totalVotes,
        newVote: {
          vote_type: newVote.vote_type,
          timestamp: newVote.timestamp
        }
      });
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
      $or: [{ ip_address: ip_address }]
    };
    
    if (session_token) {
      query.$or.push({ session_token: session_token });
    }
    
    const existingVote = await Vote.findOne(query);
    
    res.json({
      has_voted: !!existingVote,
      vote: existingVote ? {
        vote_type: existingVote.vote_type,
        timestamp: existingVote.timestamp
      } : null
    });
    
  } catch (error) {
    console.error('Vote check error:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

module.exports = router;
