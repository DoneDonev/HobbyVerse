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

// Get current user's stats (followers, following, posts count)
router.get('/me/stats', authenticateToken, async (req, res) => {
  try {
    // Get followers count
    const followersResult = await pool.query(
      'SELECT COUNT(*) as followers FROM follows WHERE following_id = $1',
      [req.user.id]
    );
    
    // Get following count
    const followingResult = await pool.query(
      'SELECT COUNT(*) as following FROM follows WHERE follower_id = $1',
      [req.user.id]
    );
    
    // Get posts count
    const postsResult = await pool.query(
      'SELECT COUNT(*) as posts FROM posts WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      followers: parseInt(followersResult.rows[0].followers),
      following: parseInt(followingResult.rows[0].following),
      posts: parseInt(postsResult.rows[0].posts)
    });
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

// Get current user's hobbies
router.get('/me/hobbies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.name FROM hobbies h
       JOIN user_hobbies uh ON h.id = uh.hobby_id
       WHERE uh.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Add a hobby to current user
router.post('/me/hobbies', authenticateToken, async (req, res) => {
  const { hobby } = req.body;
  if (!hobby) return res.status(400).json({ error: 'Hobby is required.' });
  try {
    let hobbyResult = await pool.query('SELECT id FROM hobbies WHERE name = $1', [hobby]);
    let hobbyId;
    if (hobbyResult.rows.length === 0) {
      hobbyResult = await pool.query('INSERT INTO hobbies (name) VALUES ($1) RETURNING id', [hobby]);
    }
    hobbyId = hobbyResult.rows[0].id;
    await pool.query('INSERT INTO user_hobbies (user_id, hobby_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, hobbyId]);
    // Return updated list
    const result = await pool.query(
      `SELECT h.name FROM hobbies h
       JOIN user_hobbies uh ON h.id = uh.hobby_id
       WHERE uh.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Remove a hobby from current user
router.delete('/me/hobbies', authenticateToken, async (req, res) => {
  const { hobby } = req.body;
  if (!hobby) return res.status(400).json({ error: 'Hobby is required.' });
  try {
    const hobbyResult = await pool.query('SELECT id FROM hobbies WHERE name = $1', [hobby]);
    if (hobbyResult.rows.length === 0) return res.status(404).json({ error: 'Hobby not found.' });
    const hobbyId = hobbyResult.rows[0].id;
    await pool.query('DELETE FROM user_hobbies WHERE user_id = $1 AND hobby_id = $2', [req.user.id, hobbyId]);
    // Return updated list
    const result = await pool.query(
      `SELECT h.name FROM hobbies h
       JOIN user_hobbies uh ON h.id = uh.hobby_id
       WHERE uh.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router; 