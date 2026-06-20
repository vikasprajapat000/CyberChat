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

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vikasprajapat20004_db_user:7IXmzc3isvDSs2jD@cluster0.kiyfv7l.mongodb.net/cyberchat?appName=Cluster0';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://cyber-chat-chi.vercel.app'
    : 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP so local static files are easy to load
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply Rate Limiting to HTTP routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15m
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRouter);

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
    // Generate unique name keeping extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Determine type category (image or file)
    const mimeType = req.file.mimetype;
    let fileType = 'file';
    if (mimeType.startsWith('image/')) {
      fileType = 'image';
    }

    // Construct local path URL (frontend will combine this with host if needed)
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

// Root check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Configure Socket.IO
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e7 // Increase buffer size for large events
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
    socket.user = decoded; // { id, username, email, role }
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// State Store (In-Memory)
const memoryState = {
  users: new Map(),        // userId -> { id, username, socketId, status, lastSeen, blockedUsers: [], mutedUsers: [] }
  rooms: new Map(),        // roomId -> { id, name, type, members: [userId], creatorId }
  messages: [],            // array of messages
  typingStates: new Map()  // roomId -> Set of userIds
};

// Initialize Socket Handlers
registerSocketHandlers(io, memoryState);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[CyberChat Server] Running on port ${PORT}`);
});
