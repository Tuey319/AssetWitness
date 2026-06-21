const express  = require('express');
const FormData = require('form-data');
const { postMultipart, postJSON, appendFile, cleanupFiles } = require('../services/agentClient');
const upload   = require('../middleware/upload');
const router   = express.Router();

// POST /run/agent01 — CV photo comparison (multipart)
router.post('/agent01', upload.fields([
  { name: 'move_in',  maxCount: 1 },
  { name: 'move_out', maxCount: 1 },
]), async (req, res, next) => {
  const moveIn  = req.files?.move_in?.[0];
  const moveOut = req.files?.move_out?.[0];
  try {
    const fd = new FormData();
    fd.append('claims', req.body.claims || '[]');
    appendFile(fd, 'move_in',  moveIn);
    appendFile(fd, 'move_out', moveOut);
    const data = await postMultipart('agent01', '/api/v1/agent01', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(moveIn, moveOut);
  }
});

// POST /run/agent02 — contract parser (multipart)
router.post('/agent02', upload.single('contract_file'), async (req, res, next) => {
  const contractFile = req.file;
  try {
    const fd = new FormData();
    fd.append('claims',           req.body.claims          || '[]');
    fd.append('contract_clause',  req.body.contract_clause || '');
    fd.append('lease_start',      req.body.lease_start     || '');
    fd.append('lease_end',        req.body.lease_end       || '');
    fd.append('deposit_amount',   req.body.deposit_amount  || '0');
    fd.append('monthly_rent',     req.body.monthly_rent    || '0');
    appendFile(fd, 'contract_file', contractFile);
    const data = await postMultipart('agent02', '/api/v1/agent02', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(contractFile);
  }
});

// POST /run/agent03 — legal reasoning (JSON)
router.post('/agent03', async (req, res, next) => {
  try {
    const data = await postJSON('agent03', '/api/v1/agent03', req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /run/agent04 — document generation (JSON)
router.post('/agent04', async (req, res, next) => {
  try {
    const data = await postJSON('agent04', '/api/v1/agent04', req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
