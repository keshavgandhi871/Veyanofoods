let app;
try {
  app = require('../server/index');
} catch (err) {
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'CRITICAL INIT ERROR',
      message: err.message,
      stack: err.stack
    });
  });
}
module.exports = app;
