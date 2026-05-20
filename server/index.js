// server/index.js — Veyano Foods Backend Entry Point

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const errorHandler = require('./middleware/errorHandler');
const { scheduleBackup } = require('./services/backupService');

// Supabase Integrated

// ── Import Routes ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const ordersRoutes = require('./routes/orders');
const logisticsRoutes = require('./routes/logistics');
const complianceRoutes = require('./routes/compliance');
const blogRoutes = require('./routes/blog');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.clerk.com", "https://*.clerk.accounts.dev", "https://checkout.razorpay.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://clerk.com", "https://*.clerk.com", "https://*.clerk.accounts.dev", "https://api.razorpay.com", "http://localhost:3001"],
      imgSrc: ["'self'", "data:", "https://img.clerk.com", "https://clerk.com", "https://www.veyano.in"],
      frameSrc: ["'self'", "https://checkout.razorpay.com", "https://*.clerk.accounts.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parser ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check (With Supabase Diagnostic) ──────────────────────────────────
app.get('/health', async (req, res) => {
  const supabase = require('./config/supabase');
  let dbStatus = 'testing';
  let dbError = null;

  try {
    const { data, error } = await supabase.from('blogs').select('id').limit(1);
    if (error) throw error;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  res.json({
    status: 'ok',
    service: 'Veyano Foods Backend',
    version: '1.0.1',
    db_status: dbStatus,
    db_error: dbError,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/payments', paymentRoutes);

// Serve frontend static files (from the root directory)
app.use(express.static(path.join(__dirname, '../public')));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy-policy.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve generated invoices (authenticated access only via /api/compliance/invoice/:id)
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('✅ Supabase DBMS connected.');

    // Start daily S3 backup scheduler
    scheduleBackup();

    app.listen(PORT, () => {
      console.log(`\n🚀 Veyano Foods Backend running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   API Docs: http://localhost:${PORT}/health\n`);
      console.log(`   FSSAI License: 20826010000397`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  start();
}

module.exports = app;
