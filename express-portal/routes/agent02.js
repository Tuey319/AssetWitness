const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const os       = require('os');
const router   = express.Router();
const upload   = multer({ dest: os.tmpdir() });

router.post('/', upload.single('contract_file'), async (req, res) => {
  try {
    const fd = new FormData();
    fd.append('claims',           req.body.claims            || '[]');
    fd.append('contract_clause',  req.body.contract_clause   || '');
    fd.append('lease_start',      req.body.lease_start       || '');
    fd.append('lease_end',        req.body.lease_end         || '');
    fd.append('deposit_amount',   req.body.deposit_amount    || '0');
    fd.append('monthly_rent',     req.body.monthly_rent      || '0');

    if (req.file) {
      fd.append('contract_file', fs.createReadStream(req.file.path), req.file.originalname);
    }

    const { data } = await axios.post(
      `${process.env.AGENT02_URL}/api/v1/agent02`, fd,
      { headers: fd.getHeaders() }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
  }
});

module.exports = router;
