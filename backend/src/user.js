const express = require('express');
const pool = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, profile_picture, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update profile (name, profile picture)
router.put('/me', authenticateToken, async (req, res) => {
  const { name, profile_picture } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, profile_picture = $2 WHERE id = $3 RETURNING id, name, email, profile_picture, created_at',
      [name, profile_picture, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Find users by shared hobbies
router.get('/find', authenticateToken, async (req, res) => {
  const { hobby } = req.query;
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.profile_picture FROM users u
       JOIN user_hobbies uh ON u.id = uh.user_id
       JOIN hobbies h ON uh.hobby_id = h.id
       WHERE h.name = $1 AND u.id != $2`,
      [hobby, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get a user's public profile by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('SELECT id, name, profile_picture FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router; 