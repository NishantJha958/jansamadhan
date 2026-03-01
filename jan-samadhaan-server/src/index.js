const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the server root (one level up from /src)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/citizen', require('./routes/auth.routes'));
app.use('/api/citizen', require('./routes/govtid.routes'));
app.use('/api/official', require('./routes/official.routes'));
app.use('/api', require('./routes/complaint.routes'));
app.use('/api', require('./routes/analytics.routes'));
app.use('/api', require('./routes/translate.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: 'v1.0.0-MERN',
    database: mongoose.connection.readyState === 1 ? 'MongoDB' : 'Disconnected',
    time: new Date().toISOString()
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jan-samadhaan';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected:', MONGODB_URI.split('@').pop() || MONGODB_URI);

    // Auto-seed officials on first run
    const Official = require('./models/Official');
    const count = await Official.countDocuments();
    if (count === 0) {
      console.log('🌱 No officials found, running seed...');
      require('./seed/seedOfficials')();
    }

    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('🇮🇳 BHARAT E-GRIEVANCE SYSTEM - MERN EDITION');
      console.log(`🔗 Backend running at: http://localhost:${PORT}`);
      console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️ Not configured'}`);
      console.log(`📧 Email: ${process.env.SENDER_EMAIL ? '✅ Configured' : '⚠️ Not configured'}`);
      console.log('='.repeat(60));
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('💡 Tip: Make sure MongoDB is running or set MONGODB_URI in .env');
    process.exit(1);
  });

module.exports = app;
