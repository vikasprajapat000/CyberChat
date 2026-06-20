const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'cyberchat_admin_secret_key';

// Token verification middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied: Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Access denied: Invalid token' });
  }
};

// 1. User Registration
router.post('/register-user', async (req, res) => {
  try {
    const { username, email, userId, password } = req.body;

    if (!username || !email || !userId || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({ error: 'User ID is already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      userId,
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ success: true, message: 'User registered successfully. Redirecting to Login.' });
  } catch (error) {
    console.error('User Registration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Admin Registration
router.post('/register-admin', async (req, res) => {
  try {
    const { adminName, email, adminId, password, adminSecretKey } = req.body;

    if (!adminName || !email || !adminId || !password || !adminSecretKey) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate secret key
    if (adminSecretKey !== ADMIN_SECRET_KEY) {
      return res.status(400).json({ error: 'Incorrect Admin Secret Key' });
    }

    // Check if admin/user already exists
    const existingEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const existingAdminId = await Admin.findOne({ adminId });
    if (existingAdminId) {
      return res.status(400).json({ error: 'Admin ID is already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      adminId,
      adminName,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newAdmin.save();
    res.status(201).json({ success: true, message: 'Admin registered successfully. Redirecting to Login.' });
  } catch (error) {
    console.error('Admin Registration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. User & Admin Common Login
router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ error: 'ID and Password are required' });
    }

    // A. Check User Collection
    let account = await User.findOne({ userId: id });
    let role = 'user';

    if (!account) {
      // B. Check Admin Collection
      account = await Admin.findOne({ adminId: id });
      role = 'admin';
    }

    if (!account) {
      return res.status(401).json({ error: 'Invalid ID or Password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid ID or Password' });
    }

    if (role === 'user' && account.isSuspended) {
      return res.status(403).json({ error: 'Your account is suspended by an administrator.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: role === 'user' ? account.userId : account.adminId,
        username: role === 'user' ? account.username : account.adminName,
        email: account.email,
        role: role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: role === 'user' ? account.userId : account.adminId,
        username: role === 'user' ? account.username : account.adminName,
        email: account.email,
        role: role,
        bio: role === 'user' ? account.bio : 'Server Administrator',
        statusMsg: role === 'user' ? account.statusMsg : 'Active',
        customThemeColor: role === 'user' ? account.customThemeColor : '#00a884',
        lastSeenSetting: role === 'user' ? account.lastSeenSetting : 'everyone',
        onlineVisibility: role === 'user' ? account.onlineVisibility : 'visible',
        blockedUsers: role === 'user' ? account.blockedUsers : [],
        mutedUsers: role === 'user' ? account.mutedUsers : [],
        contacts: role === 'user' ? (account.contacts || []) : [],
        sentRequests: role === 'user' ? (account.sentRequests || []) : [],
        receivedRequests: role === 'user' ? (account.receivedRequests || []) : []
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Forgot Password (Mock recovery verify)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if account exists in either User or Admin
    const user = await User.findOne({ email: email.toLowerCase() });
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!user && !admin) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Return a mock reset key code for demo/testing
    const resetToken = jwt.sign(
      { email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'Demo Recovery Code generated. Check output parameters below to reset.',
      resetToken // In production we send a link, here we return it to let user reset easily
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and New Password are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Reset link has expired or is invalid.' });
    }

    const email = decoded.email;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in User or Admin
    let user = await User.findOneAndUpdate({ email }, { password: hashedPassword });
    if (!user) {
      await Admin.findOneAndUpdate({ email }, { password: hashedPassword });
    }

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Verify Session /me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    let account;
    if (role === 'admin') {
      account = await Admin.findOne({ adminId: id });
    } else {
      account = await User.findOne({ userId: id });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      user: {
        id: role === 'admin' ? account.adminId : account.userId,
        username: role === 'admin' ? account.adminName : account.username,
        email: account.email,
        role: role,
        bio: role === 'admin' ? 'Server Administrator' : account.bio,
        statusMsg: role === 'admin' ? 'Active' : account.statusMsg,
        customThemeColor: role === 'admin' ? '#00a884' : account.customThemeColor,
        lastSeenSetting: role === 'admin' ? 'everyone' : account.lastSeenSetting,
        onlineVisibility: role === 'admin' ? 'visible' : account.onlineVisibility,
        blockedUsers: role === 'admin' ? [] : account.blockedUsers,
        mutedUsers: role === 'admin' ? [] : account.mutedUsers,
        contacts: role === 'admin' ? [] : (account.contacts || []),
        sentRequests: role === 'admin' ? [] : (account.sentRequests || []),
        receivedRequests: role === 'admin' ? [] : (account.receivedRequests || [])
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { router, verifyToken };
