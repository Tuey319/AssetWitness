import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { cleanupFiles } from '../services/agentClient';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

export async function extractContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const ext = req.file.originalname.split('.').pop()?.toLowerCase();

  if (ext !== 'pdf') {
    cleanupFiles(req.file);
    res.status(400).json({ error: 'Image OCR not supported — paste the clause text manually.' });
    return;
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdfParse(buffer);

    if (!text.trim()) {
      res.status(422).json({ error: 'Could not extract text from PDF' });
      return;
    }
    res.json({ text: text.trim() });
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(req.file);
  }
}
