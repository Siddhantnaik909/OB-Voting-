const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');

// GET /api/stats - Get current voting statistics
router.get('/', async (req, res) => {
  try {
    const stats = await Vote.aggregate([
      { $match: { subject_name: 'Organizational Behavior' } },
      { 
        $group: { 
          _id: '$vote_type', 
          count: { $sum: 1 },
          last_vote: { $max: '$timestamp' }
        } 
      }
    ]);
    
    const totalVotes = await Vote.countDocuments({ subject_name: 'Organizational Behavior' });
    
    const voteStats = stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        percentage: totalVotes > 0 ? ((curr.count / totalVotes) * 100).toFixed(1) : 0
      };
      return acc;
    }, { YES: { count: 0, percentage: 0 }, NO: { count: 0, percentage: 0 } });
    
    // Get recent votes (last 10)
    const recentVotes = await Vote.find({ subject_name: 'Organizational Behavior' })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('vote_type timestamp device_info.browser student_info.name -_id');
    
    res.json({
      total: totalVotes,
      yes: voteStats.YES,
      no: voteStats.NO,
      recent_votes: recentVotes,
      subject: 'Organizational Behavior',
      last_updated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/stats/history - Get voting history by time intervals
router.get('/history', async (req, res) => {
  try {
    const { interval = 'hour' } = req.query; // hour, minute
    
    const groupFormat = interval === 'minute' 
      ? { $dateToString: { format: '%Y-%m-%dT%H:%M', date: '$timestamp' } }
      : { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
    
    const history = await Vote.aggregate([
      { $match: { subject_name: 'Organizational Behavior' } },
      {
        $group: {
          _id: {
            time: groupFormat,
            vote_type: '$vote_type'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.time': 1 } }
    ]);
    
    // Transform to time-based format
    const timeMap = {};
    history.forEach(item => {
      const time = item._id.time;
      if (!timeMap[time]) {
        timeMap[time] = { time, YES: 0, NO: 0 };
      }
      timeMap[time][item._id.vote_type] = item.count;
    });
    
    res.json({
      history: Object.values(timeMap),
      interval
    });
    
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch voting history' });
  }
});

module.exports = router;
