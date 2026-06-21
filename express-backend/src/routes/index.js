const express = require('express');
const axios   = require('axios');
const config  = require('../config');
const router  = express.Router();

router.use('/run',              require('./agents'));
router.use('/extract-contract', require('./extract'));

router.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${config.agents.agent03}/health`, { timeout: 2000 });
    res.json({ status: 'ok', corpus_loaded: data.corpus_ready ?? false });
  } catch {
    res.json({ status: 'ok', corpus_loaded: false });
  }
});

module.exports = router;
