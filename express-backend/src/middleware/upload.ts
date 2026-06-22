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
