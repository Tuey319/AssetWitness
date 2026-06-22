import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config, AgentKey } from '../config/index';

export async function postMultipart(agentKey: AgentKey, endpoint: string, fd: FormData): Promise<unknown> {
  const url = `${config.agents[agentKey]}${endpoint}`;
  const { data } = await axios.post(url, fd, {
    headers: fd.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
}

export async function postJSON(agentKey: AgentKey, endpoint: string, body: unknown): Promise<unknown> {
  const url = `${config.agents[agentKey]}${endpoint}`;
  const { data } = await axios.post(url, body);
  return data;
}

export function appendFile(
  fd: FormData,
  fieldName: string,
  multerFile: Express.Multer.File | undefined,
): void {
  if (!multerFile) return;
  fd.append(fieldName, fs.createReadStream(multerFile.path), multerFile.originalname);
}

export function cleanupFiles(...files: Array<Express.Multer.File | undefined>): void {
  for (const f of files) {
    if (!f) continue;
    try { fs.unlinkSync(f.path); } catch { /* ignore cleanup errors */ }
  }
}
