const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', require('./routes'));

// Central error handler
app.use((err, req, res, next) => {
  const status  = err.response?.status || 500;
  const message = err.response?.data?.detail || err.message || 'Internal server error';
  console.error(`[error] ${req.method} ${req.path} — ${message}`);
  res.status(status).json({ error: message });
});

module.exports = app;
