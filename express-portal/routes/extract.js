const express  = require('express');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const fs       = require('fs');
const os       = require('os');
const router   = express.Router();
const upload   = multer({ dest: os.tmpdir() });

router.post('/', upload.single('contract_file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (ext !== 'pdf') {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: `Image OCR not supported here — paste the clause text manually.` });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdfParse(buffer);
    if (!text.trim()) return res.status(422).json({ error: 'Could not extract text from PDF' });
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

module.exports = router;
