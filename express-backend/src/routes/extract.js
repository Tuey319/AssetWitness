const express  = require('express');
const pdfParse = require('pdf-parse');
const fs       = require('fs');
const upload   = require('../middleware/upload');
const { cleanupFiles } = require('../services/agentClient');
const router   = express.Router();

// POST /extract-contract — extract text from uploaded PDF
router.post('/', upload.single('contract_file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = req.file.originalname.split('.').pop().toLowerCase();

  if (ext !== 'pdf') {
    cleanupFiles(req.file);
    return res.status(400).json({ error: 'Image OCR not supported — paste the clause text manually.' });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdfParse(buffer);

    if (!text.trim()) {
      return res.status(422).json({ error: 'Could not extract text from PDF' });
    }
    res.json({ text: text.trim() });
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(req.file);
  }
});

module.exports = router;
