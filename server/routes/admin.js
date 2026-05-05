const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Vote = require('../models/Vote');
const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES = '24h';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.admin = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check credentials (using defaults if env vars not set)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === adminUsername && password === adminPassword) {
      // Create admin in database if doesn't exist
      let admin = await Admin.findOne({ username: adminUsername });
      if (!admin) {
        admin = new Admin({ username: adminUsername, password: adminPassword });
        await admin.save();
      }
      
      // Generate token
      const token = jwt.sign(
        { username: adminUsername, role: 'admin' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      
      return res.json({
        success: true,
        token,
        expires_in: JWT_EXPIRES,
        admin: { username: adminUsername }
      });
    }
    
    // Check database
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({ 
        error: 'Account is locked. Please try again later.' 
      });
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    
    if (!isValidPassword) {
      // Increment failed attempts
      admin.login_attempts += 1;
      
      // Lock account after 5 failed attempts
      if (admin.login_attempts >= 5) {
        admin.lock_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await admin.save();
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Reset login attempts on successful login
    admin.login_attempts = 0;
    admin.lock_until = null;
    admin.last_login = new Date();
    await admin.save();
    
    // Generate token
    const token = jwt.sign(
      { username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    res.json({
      success: true,
      token,
      expires_in: JWT_EXPIRES,
      admin: { username: admin.username }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/admin/dashboard - Get dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get vote statistics
    const stats = await Vote.aggregate([
      { $match: { subject_name: 'Organizational Behavior' } },
      { $group: { _id: '$vote_type', count: { $sum: 1 } } }
    ]);
    
    const totalVotes = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
    
    // Get votes from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentVotes = await Vote.countDocuments({
      subject_name: 'Organizational Behavior',
      timestamp: { $gte: last24Hours }
    });
    
    // Get unique IPs
    const uniqueIPs = await Vote.distinct('ip_address', { subject_name: 'Organizational Behavior' });
    
    // Get browser breakdown
    const browserStats = await Vote.aggregate([
      { $match: { subject_name: 'Organizational Behavior' } },
      { $group: { _id: '$device_info.browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    const voteCounts = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { YES: 0, NO: 0 });
    
    // Get most recent 100 votes
    const recentVotesList = await Vote.find({ subject_name: 'Organizational Behavior' })
      .sort({ timestamp: -1 })
      .limit(100)
      .select('vote_id vote_type timestamp student_info ip_address');
    
    res.json({
      total_votes: totalVotes,
      recent_votes: recentVotes,
      unique_voters: uniqueIPs.length,
      yes_count: voteCounts.YES,
      no_count: voteCounts.NO,
      yes_percentage: totalVotes > 0 ? ((voteCounts.YES / totalVotes) * 100).toFixed(1) : 0,
      no_percentage: totalVotes > 0 ? ((voteCounts.NO / totalVotes) * 100).toFixed(1) : 0,
      browser_breakdown: browserStats,
      recent_votes_list: recentVotesList,
      subject: 'Organizational Behavior',
      last_updated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// DELETE /api/admin/votes/reset - Reset all votes (requires confirmation)
router.delete('/votes/reset', authenticateToken, async (req, res) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE_ALL_VOTES') {
      return res.status(400).json({ 
        error: 'Confirmation required. Send confirmation: "DELETE_ALL_VOTES"' 
      });
    }
    
    // Backup before deletion (optional - could be enhanced)
    const backupCount = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
    
    // Delete all votes
    await Vote.deleteMany({ subject_name: 'Organizational Behavior' });
    
    // Emit reset event
    if (req.io) {
      req.io.emit('votes_reset', { 
        message: 'All votes have been reset',
        deleted_count: backupCount,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'All votes have been reset successfully',
      deleted_count: backupCount
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset votes' });
  }
});

// GET /api/admin/votes - Get all votes with pagination
router.get('/votes', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'desc' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort === 'asc' ? 1 : -1;
    
    const votes = await Vote.find({ subject_name: 'Organizational Behavior' })
      .sort({ timestamp: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    
    const total = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
    
    res.json({
      votes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// POST /api/admin/change-password - Change admin password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const admin = await Admin.findOne({ username: req.admin.username });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const isValidPassword = await admin.comparePassword(current_password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    admin.password = new_password;
    await admin.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/admin/votes/:vote_id - Delete a specific vote
router.delete('/votes/:vote_id', authenticateToken, async (req, res) => {
  try {
    const { vote_id } = req.params;
    
    const result = await Vote.findOneAndDelete({ vote_id });
    
    if (!result) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    
    // Emit update event
    if (req.io) {
      req.io.emit('votes_updated');
    }
    
    res.json({ success: true, message: 'Vote deleted successfully' });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ error: 'Failed to delete vote' });
  }
});

// GET /api/admin/settings - Get settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await Settings.findOne({ subject: 'Organizational Behavior' });
    if (!settings) {
      settings = new Settings({ subject: 'Organizational Behavior' });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/admin/settings - Update settings
router.post('/settings', authenticateToken, async (req, res) => {
  try {
    const { resultsPublic, votingOpen, deadline, timerEnabled } = req.body;
    const updateData = {};
    if (resultsPublic !== undefined) updateData.resultsPublic = resultsPublic;
    if (votingOpen !== undefined) updateData.votingOpen = votingOpen;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (timerEnabled !== undefined) updateData.timerEnabled = timerEnabled;

    let settings = await Settings.findOneAndUpdate(
      { subject: 'Organizational Behavior' },
      updateData,
      { new: true, upsert: true }
    );
    
    if (req.io) {
      req.io.emit('settings_updated', settings);
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/admin/seed - Seed fake data
router.post('/seed', authenticateToken, async (req, res) => {
  try {
    const { count = 10 } = req.body;
    const fakeVotes = [];
    const names = ['Rahul Sharma', 'Sneha Patil', 'Amit Verma', 'Priya Singh', 'Vikram Das', 'Anjali Gupta', 'Karan Mehta', 'Deepa Nair', 'Rohan Joshi', 'Meera Iyer'];
    const votes = ['YES', 'NO'];
    
    for (let i = 0; i < count; i++) {
      const prn = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      fakeVotes.push({
        vote_id: uuidv4(),
        subject_name: 'Organizational Behavior',
        vote_type: votes[Math.floor(Math.random() * votes.length)],
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        device_info: {
          browser: 'Chrome',
          os: 'Windows',
          device: 'Desktop'
        },
        student_info: {
          name: names[Math.floor(Math.random() * names.length)],
          prn_number: prn,
          seat_number: `S${Math.floor(100 + Math.random() * 900)}`
        }
      });
    }
    
    await Vote.insertMany(fakeVotes);
    
    if (req.io) {
      req.io.emit('votes_updated');
    }
    
    res.json({ success: true, message: `Successfully seeded ${count} fake votes` });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

// POST /api/admin/add-vote - Add a student manually
router.post('/add-vote', authenticateToken, async (req, res) => {
  try {
    const { name, prn_number, seat_number, vote_type } = req.body;
    
    const newVote = new Vote({
      vote_id: uuidv4(),
      subject_name: 'Organizational Behavior',
      vote_type,
      ip_address: `ADMIN_MANUAL_${uuidv4()}`,
      device_info: {
        browser: 'Admin Panel',
        os: 'AdminPanel',
        device: 'Admin'
      },
      student_info: {
        name,
        prn_number,
        seat_number
      }
    });
    
    await newVote.save();
    
    if (req.io) {
      // Fetch updated stats to send a full update like the student route does
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
        total: totalVotes
      });
    }
    
    res.json({ success: true, message: 'Student vote added successfully' });
  } catch (error) {
    console.error('Add vote error:', error);
    res.status(500).json({ error: 'Failed to add student vote' });
  }
});

// POST /api/admin/register - Create a new admin account (Requires existing admin)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'New administrator account created successfully' 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

module.exports = router;
