require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const guestRoutes = require('./routes/guests');
const rsvpRoutes = require('./routes/rsvp');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check — no auth required
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes — no middleware (register/login are public)
app.use('/api/auth', authRoutes);

// Public RSVP routes — no auth required
app.use('/api/rsvp', rsvpRoutes);

// All routes below require valid JWT
app.use('/api', authMiddleware);

// Guest management routes (auth enforced above)
app.use('/api', guestRoutes);

// Serve React frontend in production
app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`אירועית server running on port ${PORT}`);
});
