const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Vote = require('../models/Vote');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// GET /api/export/excel - Export votes to Excel
router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, format = 'xlsx' } = req.query;
    
    // Build query
    const query = { subject_name: 'Organizational Behavior' };
    
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }
    
    // Fetch all votes (no pagination for export)
    const votes = await Vote.find(query)
      .sort({ timestamp: -1 })
      .select('vote_id subject_name vote_type timestamp ip_address device_info student_info');
    
    if (votes.length === 0) {
      return res.status(404).json({ error: 'No votes found for the specified criteria' });
    }
    
    // Prepare data for Excel
    const exportData = votes.map((vote, index) => ({
      'S.No': index + 1,
      'Vote ID': vote.vote_id,
      'Subject Name': vote.subject_name,
      'Vote Type': vote.vote_type,
      'Timestamp': vote.timestamp.toISOString(),
      'Date': vote.timestamp.toLocaleDateString('en-IN'),
      'Time': vote.timestamp.toLocaleTimeString('en-IN'),
      'IP Address': vote.ip_address,
      'Browser': vote.device_info?.browser || 'Unknown',
      'Operating System': vote.device_info?.os || 'Unknown',
      'Device': vote.device_info?.device || 'Unknown',
      'Student Name': vote.student_info?.name || '',
      'Seat Number': vote.student_info?.seat_number || '',
      'PRN Number': vote.student_info?.prn_number || ''
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 6 },   // S.No
      { wch: 38 },  // Vote ID
      { wch: 25 },  // Subject Name
      { wch: 12 },  // Vote Type
      { wch: 25 },  // Timestamp
      { wch: 12 },  // Date
      { wch: 12 },  // Time
      { wch: 15 },  // IP Address
      { wch: 25 },  // Browser
      { wch: 20 },  // OS
      { wch: 15 },  // Device
      { wch: 20 },  // Student Name
      { wch: 15 },  // Seat Number
      { wch: 15 }   // PRN Number
    ];
    ws['!cols'] = colWidths;
    
    // Add summary
    const summaryData = [
      ['Voting Report Summary'],
      [''],
      ['Subject:', vote.subject_name || 'Organizational Behavior'],
      ['Total Votes:', votes.length],
      ['Yes Votes:', votes.filter(v => v.vote_type === 'YES').length],
      ['No Votes:', votes.filter(v => v.vote_type === 'NO').length],
      ['Export Date:', new Date().toLocaleString('en-IN')],
      ['']
    ];
    
    // Add summary at the beginning
    XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: 0 });
    
    // Shift data down by summary rows + header
    const headerRow = summaryData.length + 1;
    
    // Rename sheet
    XLSX.utils.book_append_sheet(wb, ws, 'Voting Report');
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `OB_Voting_Report_${timestamp}.${format}`;
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: format });
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export votes' });
  }
});

// GET /api/export/csv - Export votes to CSV
router.get('/csv', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Build query
    const query = { subject_name: 'Organizational Behavior' };
    
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }
    
    const votes = await Vote.find(query)
      .sort({ timestamp: -1 })
      .select('vote_id subject_name vote_type timestamp ip_address device_info student_info');
    
    if (votes.length === 0) {
      return res.status(404).json({ error: 'No votes found for the specified criteria' });
    }
    
    // Prepare CSV data
    const exportData = votes.map((vote, index) => ({
      'S.No': index + 1,
      'Vote ID': vote.vote_id,
      'Subject Name': vote.subject_name,
      'Vote Type': vote.vote_type,
      'Timestamp': vote.timestamp.toISOString(),
      'IP Address': vote.ip_address,
      'Browser': vote.device_info?.browser || 'Unknown',
      'OS': vote.device_info?.os || 'Unknown',
      'Student Name': vote.student_info?.name || '',
      'Seat Number': vote.student_info?.seat_number || '',
      'PRN Number': vote.student_info?.prn_number || ''
    }));
    
    // Create workbook and convert to CSV
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Voting Report');
    
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `OB_Voting_Report_${timestamp}.csv`;
    
    // Set headers for download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export votes' });
  }
});

// POST /api/export/preview - Preview export data (without downloading)
router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    // Build query
    const query = { subject_name: 'Organizational Behavior' };
    
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }
    
    // Get count and preview (first 5 records)
    const total = await Vote.countDocuments(query);
    const preview = await Vote.find(query)
      .sort({ timestamp: -1 })
      .limit(5)
      .select('vote_id vote_type timestamp student_info');
    
    const yesCount = await Vote.countDocuments({ ...query, vote_type: 'YES' });
    const noCount = await Vote.countDocuments({ ...query, vote_type: 'NO' });
    
    res.json({
      preview,
      summary: {
        total,
        yes_count: yesCount,
        no_count: noCount,
        date_range: { start_date, end_date }
      }
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

module.exports = router;
