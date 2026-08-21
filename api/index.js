/**
 * api/index.js — Veyano Foods Vercel Serverless Handler
 *
 * Modular architecture with clean separation:
 * - /api/public/*  : Public-facing endpoints for storefront & customers
 * - /api/private/* : Protected internal endpoints (diagnostics, inventory, compliance)
 */

// Load .env for local development (harmless no-op if file doesn't exist)
try { require('dotenv').config(); } catch (_) {}
try {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
} catch (_) {}

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

// ── Private Route Handlers & Auth ─────────────────────────────────────────────
const privateAuthMiddleware   = require('./_private/middleware');
const privateHealthRouter     = require('./_private/health');
const privateInventoryRouter  = require('./_private/inventory');
const privateComplianceRouter = require('./_private/compliance');

// ── Public Route Handlers ─────────────────────────────────────────────────────
const publicAuthRouter     = require('./_public/auth');
const publicBlogRouter     = require('./_public/blog');
const publicOrdersRouter   = require('./_public/orders');
const publicPaymentsRouter = require('./_public/payments');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// ── Public Health Check (Safe minimal status, no private key/database leakage) ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Veyano Foods API',
    timestamp: new Date().toISOString(),
  });
});

// ── Mount Public Storefront Routes ────────────────────────────────────────────
app.use('/api/auth', publicAuthRouter);
app.use('/api/blog', publicBlogRouter);
app.use('/api/orders', publicOrdersRouter);
app.use('/api/payments', publicPaymentsRouter);

// ── Mount Private Protected Routes (Requires Admin Authorization) ─────────────
app.use('/api/private', privateAuthMiddleware);
app.use('/api/private/health', privateHealthRouter);
app.use('/api/private/inventory', privateInventoryRouter);
app.use('/api/private/compliance', privateComplianceRouter);

// ── Catch-All 404 ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
