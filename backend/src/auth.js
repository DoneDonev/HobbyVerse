const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const router = express.Router();

// Register
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, profile_picture, created_at',
      [name, email, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });
    
    // Return user object along with token
    res.status(201).json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_picture: user.profile_picture
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    
    // Create a clean user object without password
    const userForResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      profile_picture: user.profile_picture
    };
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });
    res.json({ token, user: userForResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router; 