import multer from 'multer';
import os from 'os';
import { config } from '../config/index';

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${suffix}-${file.originalname}`);
  },
});

export default multer({ storage, limits: { fileSize: config.maxFileSizeBytes } });

// Multipart field configs shared by routes/index.ts
export const agent01Fields = [
  { name: 'prior_condition',   maxCount: 10 },
  { name: 'current_condition', maxCount: 10 },
];

export const agent02Fields = [
  { name: 'agreement_file', maxCount: 1 },
];

export const fullAnalysisFields = [
  { name: 'prior_condition_image',   maxCount: 10 },
  { name: 'current_condition_image', maxCount: 10 },
];
