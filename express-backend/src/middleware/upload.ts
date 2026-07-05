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
  { name: 'move_in',  maxCount: 10 },
  { name: 'move_out', maxCount: 10 },
];

export const agent02Fields = [
  { name: 'contract_file', maxCount: 1 },
  { name: 'screenshots',   maxCount: 10 },
];

export const fullAnalysisFields = [
  { name: 'move_in_image',  maxCount: 10 },
  { name: 'move_out_image', maxCount: 10 },
  { name: 'screenshots',    maxCount: 10 },
];
