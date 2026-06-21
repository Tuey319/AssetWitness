const express = require('express');
const axios   = require('axios');
const router  = express.Router();

router.post('/', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${process.env.AGENT04_URL}/api/v1/agent04`, req.body
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
