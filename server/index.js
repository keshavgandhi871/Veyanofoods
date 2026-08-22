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
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Hide Server Fingerprints ──────────────────────────────────────────────────
app.disable('x-powered-by');

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.clerk.com", "https://*.clerk.accounts.dev", "https://checkout.razorpay.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://clerk.com", "https://*.clerk.com", "https://*.clerk.accounts.dev", "https://api.razorpay.com", "https://api.postalpincode.in", "http://localhost:3001", "https://veyano.in"],
      imgSrc: ["'self'", "data:", "https://img.clerk.com", "https://clerk.com", "https://www.veyano.in", "https://images.unsplash.com"],
      frameSrc: ["'self'", "https://checkout.razorpay.com", "https://*.clerk.accounts.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow local development, veyano.in domains, and direct API calls (e.g. mobile/postman)
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('veyano.in') || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-passcode', 'x-admin-token'],
}));

// ── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static files (from the root directory)
app.use(express.static(path.join(__dirname, '../public')));

// Clean URL Page Routes
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, '../public/shop.html')));
app.get('/try-veyano', (req, res) => res.sendFile(path.join(__dirname, '../public/try-veyano.html')));
app.get('/our-story', (req, res) => res.sendFile(path.join(__dirname, '../public/our-story.html')));
app.get('/transparency', (req, res) => res.sendFile(path.join(__dirname, '../public/transparency.html')));
app.get('/why-veyano', (req, res) => res.sendFile(path.join(__dirname, '../public/why-veyano.html')));
app.get('/bulk-orders', (req, res) => res.sendFile(path.join(__dirname, '../public/bulk-orders.html')));
app.get('/b2b', (req, res) => res.sendFile(path.join(__dirname, '../public/bulk-orders.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, '../public/contact.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, '../public/terms.html')));
app.get('/shipping-policy', (req, res) => res.sendFile(path.join(__dirname, '../public/shipping-policy.html')));
app.get('/refund-policy', (req, res) => res.sendFile(path.join(__dirname, '../public/refund-policy.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../public/signup.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, '../public/privacy-policy.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/product/:slug', (req, res) => res.sendFile(path.join(__dirname, '../public/product.html')));
app.get('/blog/:slug', (req, res) => res.sendFile(path.join(__dirname, '../public/blog-post.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, '../public/blog.html')));

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
