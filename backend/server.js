const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { SOCKET_EVENTS } = require('../shared/constants.json');
const registerSocketHandlers = require('./socketHandler');
const mongoose = require('mongoose');
const { router: authRouter } = require('./routes/auth');
const { router: usersRouter } = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const communitiesRouter = require('./routes/communities');
const channelsRouter = require('./routes/channels');
const storiesRouter = require('./routes/stories');
const aiRouter = require('./routes/ai');
const premiumRouter = require('./routes/premium');
const streaksRouter = require('./routes/streaks');

// Models (required early to ensure TTL indexes are created on startup)
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const CallHistory = require('./models/CallHistory');
const Story = require('./models/Story');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vikasprajapat20004_db_user:7IXmzc3isvDSs2jD@cluster0.kiyfv7l.mongodb.net/cyberchat?appName=Cluster0';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully!');
    // Ensure TTL index on disappearsAt field for auto message deletion
    await Message.collection.createIndex({ disappearsAt: 1 }, { expireAfterSeconds: 0, sparse: true });
    console.log('[CyberChat] TTL index on Message.disappearsAt set.');
    // Ensure TTL index on Story.expiresAt for 24h auto-deletion
    await Story.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('[CyberChat] TTL index on Story.expiresAt set.');
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: ['https://cyber-chat-exqq.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Trust Render's reverse proxy so rate limiter gets the real client IP
app.set('trust proxy', 1);

// Health check endpoints defined BEFORE rate limiter to avoid blocking health checks (429 errors)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Apply Rate Limiting to HTTP routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/premium', premiumRouter);
app.use('/api/streaks', streaksRouter);

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (increased for video calls recording)
  fileFilter: (req, file, cb) => {
    // Allow images, audio, video, documents, and GIFs
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|ogg|wav|pdf|doc|docx|txt|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} is not allowed`));
    }
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mimeType = req.file.mimetype;
    let fileType = 'file';
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';
    else if (mimeType.startsWith('audio/')) fileType = 'audio';

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileType,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Profile photo upload
app.post('/api/upload/profile-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    // Verify JWT
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findOne({ userId: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old profile photo
    if (user.profilePhoto) {
      const oldPath = path.join(uploadsDir, path.basename(user.profilePhoto));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePhoto = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ success: true, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error('Profile Photo Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Cover photo upload
app.post('/api/upload/cover-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findOne({ userId: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.coverPhoto) {
      const oldPath = path.join(uploadsDir, path.basename(user.coverPhoto));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.coverPhoto = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ success: true, coverPhoto: user.coverPhoto });
  } catch (error) {
    console.error('Cover Photo Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Group photo upload
app.post('/api/upload/group-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, groupPhoto: fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload group photo' });
  }
});

// Health check endpoints moved above to prevent rate-limiting (429)

// Configure Socket.IO
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e7
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// State Store (In-Memory)
const memoryState = {
  users: new Map(),
  rooms: new Map(),
  messages: [],
  typingStates: new Map()
};

// Initialize Socket Handlers
registerSocketHandlers(io, memoryState);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[CyberChar Server] Running on port ${PORT}`);
});
