const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const os       = require('os');
const router   = express.Router();
const upload   = multer({ dest: os.tmpdir() });

router.post('/', upload.fields([
  { name: 'move_in',  maxCount: 1 },
  { name: 'move_out', maxCount: 1 },
]), async (req, res) => {
  try {
    const fd = new FormData();
    fd.append('claims', req.body.claims || '[]');

    if (req.files?.move_in?.[0]) {
      fd.append('move_in', fs.createReadStream(req.files.move_in[0].path),
        req.files.move_in[0].originalname);
    }
    if (req.files?.move_out?.[0]) {
      fd.append('move_out', fs.createReadStream(req.files.move_out[0].path),
        req.files.move_out[0].originalname);
    }

    const { data } = await axios.post(
      `${process.env.AGENT01_URL}/api/v1/agent01`, fd,
      { headers: fd.getHeaders() }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    Object.values(req.files || {}).flat().forEach(f => {
      try { fs.unlinkSync(f.path); } catch {}
    });
  }
});

module.exports = router;
