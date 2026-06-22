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

    if (decoded.role === 'user') {
      const user = await User.findOne({ userId: decoded.id }).select('isSuspended isBanned devices');
      if (!user) {
        return res.status(401).json({ error: 'Account not found' });
      }
      if (user.isSuspended) {
        return res.status(403).json({ error: 'Your account is suspended by an administrator.' });
      }
      if (user.isBanned) {
        return res.status(403).json({ error: 'Your account has been permanently banned.' });
      }
      // If devices list exists, verify this token is still registered (not revoked remotely)
      if (user.devices && user.devices.length > 0) {
        const hasSession = user.devices.some(d => d.token === token);
        if (!hasSession) {
          return res.status(401).json({ error: 'Session terminated' });
        }
      }
    }
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

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({ error: 'User ID is already taken' });
    }

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

    if (adminSecretKey !== ADMIN_SECRET_KEY) {
      return res.status(400).json({ error: 'Incorrect Admin Secret Key' });
    }

    const existingEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const existingAdminId = await Admin.findOne({ adminId });
    if (existingAdminId) {
      return res.status(400).json({ error: 'Admin ID is already taken' });
    }

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
    const id = String(req.body.id || '').trim();
    const password = String(req.body.password || '');

    if (!id || !password) {
      return res.status(400).json({ error: 'ID and Password are required' });
    }

    let account = await User.findOne({ userId: id });
    let role = 'user';

    if (!account) {
      account = await Admin.findOne({ adminId: id });
      role = 'admin';
    }

    if (!account) {
      return res.status(401).json({ error: 'Invalid ID or Password' });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid ID or Password' });
    }

    if (role === 'user' && account.isSuspended) {
      return res.status(403).json({ error: 'Your account is suspended by an administrator.' });
    }

    if (role === 'user' && account.isBanned) {
      return res.status(403).json({ error: 'Your account has been permanently banned.' });
    }

    // Record login IP for login alert
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const token = jwt.sign(
      {
        id: role === 'user' ? account.userId : account.adminId,
        username: role === 'user' ? account.username : account.adminName,
        email: account.email,
        role: role
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: role === 'user' ? account.userId : account.adminId,
        role: role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const RefreshToken = require('../models/RefreshToken');
    await new RefreshToken({
      token: refreshToken,
      userId: role === 'user' ? account.userId : account.adminId,
      role: role
    }).save();

    if (role === 'user') {
      const parsedUA = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
      const deviceName = userAgent.split(')')[0].split('(')[1] || 'Web Browser';
      const deviceId = require('crypto').createHash('md5').update(`${clientIp}-${userAgent}`).digest('hex').substring(0, 8);

      account.devices = account.devices || [];
      account.devices = account.devices.filter(d => d.deviceId !== deviceId);
      account.devices.push({
        deviceId,
        deviceName,
        platform: parsedUA,
        lastActiveAt: new Date(),
        token: token
      });
      if (account.devices.length > 5) account.devices = account.devices.slice(-5);

      if (account.loginAlerts) {
        account.loginHistory = account.loginHistory || [];
        account.loginHistory.unshift({ ip: clientIp, userAgent, timestamp: new Date() });
        if (account.loginHistory.length > 10) account.loginHistory = account.loginHistory.slice(0, 10);
      }
      await account.save();
    }

    res.json({
      success: true,
      token,
      refreshToken,
      loginIp: clientIp,
      user: {
        id: role === 'user' ? account.userId : account.adminId,
        username: role === 'user' ? account.username : account.adminName,
        email: account.email,
        role: role,
        bio: role === 'user' ? account.bio : 'Server Administrator',
        statusMsg: role === 'user' ? account.statusMsg : 'Active',
        profilePhoto: role === 'user' ? account.profilePhoto : null,
        coverPhoto: role === 'user' ? account.coverPhoto : null,
        customThemeColor: role === 'user' ? account.customThemeColor : '#00a884',
        lastSeenSetting: role === 'user' ? account.lastSeenSetting : 'everyone',
        onlineVisibility: role === 'user' ? account.onlineVisibility : 'visible',
        profilePhotoVisibility: role === 'user' ? account.profilePhotoVisibility : 'everyone',
        blockedUsers: role === 'user' ? account.blockedUsers : [],
        mutedUsers: role === 'user' ? account.mutedUsers : [],
        contacts: role === 'user' ? (account.contacts || []) : [],
        sentRequests: role === 'user' ? (account.sentRequests || []) : [],
        receivedRequests: role === 'user' ? (account.receivedRequests || []) : [],
        followers: role === 'user' ? (account.followers || []) : [],
        following: role === 'user' ? (account.following || []) : [],
        pinLock: role === 'user' ? !!account.pinLock : false,
        fingerprintEnabled: role === 'user' ? account.fingerprintEnabled : false,
        loginAlerts: role === 'user' ? account.loginAlerts : false,
        e2eEnabled: role === 'user' ? account.e2eEnabled : false,
        disappearingMessageTimer: role === 'user' ? account.disappearingMessageTimer : 0,
        notificationSettings: role === 'user' ? account.notificationSettings : {},
        language: role === 'user' ? account.language : 'en',
        loginHistory: role === 'user' && account.loginAlerts ? (account.loginHistory || []).slice(0, 5) : []
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!user && !admin) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    const resetToken = jwt.sign(
      { email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'Demo Recovery Code generated. Check output parameters below to reset.',
      resetToken
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

// 6. Change Password (authenticated)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }

    let account;
    if (role === 'admin') {
      account = await Admin.findOne({ adminId: id });
    } else {
      account = await User.findOne({ userId: id });
    }

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Set / Verify PIN Lock
router.post('/pin-lock', verifyToken, async (req, res) => {
  try {
    const { action, pin } = req.body;
    const { id, role } = req.user;

    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });
    if (!pin || pin.length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });

    const user = await User.findOne({ userId: id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'set') {
      user.pinLock = await bcrypt.hash(pin, 10);
      await user.save();
      return res.json({ success: true, message: 'PIN Lock set successfully.' });
    }

    if (action === 'verify') {
      if (!user.pinLock) return res.status(400).json({ error: 'No PIN set' });
      const match = await bcrypt.compare(pin, user.pinLock);
      return res.json({ success: match, message: match ? 'PIN verified.' : 'Incorrect PIN.' });
    }

    if (action === 'remove') {
      if (!user.pinLock) return res.status(400).json({ error: 'No PIN set' });
      const match = await bcrypt.compare(pin, user.pinLock);
      if (!match) return res.status(401).json({ error: 'Incorrect PIN' });
      user.pinLock = null;
      await user.save();
      return res.json({ success: true, message: 'PIN Lock removed.' });
    }

    res.status(400).json({ error: 'Invalid action. Use set, verify, or remove.' });
  } catch (error) {
    console.error('PIN Lock Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Verify Session /me
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
        profilePhoto: role === 'admin' ? null : account.profilePhoto,
        coverPhoto: role === 'admin' ? null : account.coverPhoto,
        customThemeColor: role === 'admin' ? '#00a884' : account.customThemeColor,
        lastSeenSetting: role === 'admin' ? 'everyone' : account.lastSeenSetting,
        onlineVisibility: role === 'admin' ? 'visible' : account.onlineVisibility,
        profilePhotoVisibility: role === 'admin' ? 'everyone' : account.profilePhotoVisibility,
        blockedUsers: role === 'admin' ? [] : account.blockedUsers,
        mutedUsers: role === 'admin' ? [] : account.mutedUsers,
        contacts: role === 'admin' ? [] : (account.contacts || []),
        sentRequests: role === 'admin' ? [] : (account.sentRequests || []),
        receivedRequests: role === 'admin' ? [] : (account.receivedRequests || []),
        followers: role === 'admin' ? [] : (account.followers || []),
        following: role === 'admin' ? [] : (account.following || []),
        pinLock: role === 'admin' ? false : !!account.pinLock,
        fingerprintEnabled: role === 'admin' ? false : account.fingerprintEnabled,
        loginAlerts: role === 'admin' ? false : account.loginAlerts,
        e2eEnabled: role === 'admin' ? false : account.e2eEnabled,
        disappearingMessageTimer: role === 'admin' ? 0 : account.disappearingMessageTimer,
        notificationSettings: role === 'admin' ? {} : account.notificationSettings,
        language: role === 'admin' ? 'en' : account.language
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. Token Refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const RefreshToken = require('../models/RefreshToken');
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      return res.status(403).json({ error: 'Refresh token not found or expired' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      
      let account;
      if (decoded.role === 'admin') {
        account = await Admin.findOne({ adminId: decoded.id });
      } else {
        account = await User.findOne({ userId: decoded.id });
      }

      if (!account || (decoded.role === 'user' && (account.isSuspended || account.isBanned))) {
        return res.status(403).json({ error: 'User account inactive or banned' });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          id: decoded.role === 'admin' ? account.adminId : account.userId,
          username: decoded.role === 'admin' ? account.adminName : account.username,
          email: account.email,
          role: decoded.role
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Generate new rotated refresh token
      const newRefreshToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Replace old refresh token in DB
      await RefreshToken.deleteOne({ token: refreshToken });
      await new RefreshToken({
        token: newRefreshToken,
        userId: decoded.id,
        role: decoded.role
      }).save();

      // Update the access token registered in user's devices
      if (decoded.role === 'user') {
        const authHeader = req.headers['authorization'];
        const oldAccessToken = authHeader && authHeader.split(' ')[1];
        
        let sessionUpdated = false;
        if (oldAccessToken && account.devices) {
          const idx = account.devices.findIndex(d => d.token === oldAccessToken);
          if (idx !== -1) {
            account.devices[idx].token = newAccessToken;
            account.devices[idx].lastActiveAt = new Date();
            sessionUpdated = true;
          }
        }

        if (!sessionUpdated && account.devices && account.devices.length > 0) {
          const userAgent = req.headers['user-agent'] || 'unknown';
          const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
          const deviceId = require('crypto').createHash('md5').update(`${clientIp}-${userAgent}`).digest('hex').substring(0, 8);
          
          const idx = account.devices.findIndex(d => d.deviceId === deviceId);
          if (idx !== -1) {
            account.devices[idx].token = newAccessToken;
            account.devices[idx].lastActiveAt = new Date();
          } else {
            const parsedUA = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
            const deviceName = userAgent.split(')')[0].split('(')[1] || 'Web Browser';
            account.devices.push({
              deviceId,
              deviceName,
              platform: parsedUA,
              lastActiveAt: new Date(),
              token: newAccessToken
            });
            if (account.devices.length > 5) account.devices = account.devices.slice(-5);
          }
        }
        await account.save();
      }

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });

    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 10. Logout Session
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const { refreshToken } = req.body;

    const RefreshToken = require('../models/RefreshToken');
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    if (req.user.role === 'user') {
      const user = await User.findOne({ userId: req.user.id });
      if (user && user.devices) {
        user.devices = user.devices.filter(d => d.token !== token);
        await user.save();
      }
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { router, verifyToken };
