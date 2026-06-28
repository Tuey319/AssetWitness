import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import {
  agent01BodySchema,
  agent02BodySchema,
  agent03BodySchema,
  agent04BodySchema,
} from '../schemas/agentSchemas';
import { postMultipart, postJSON, appendFile, cleanupFiles } from '../services/agentClient';

export async function runAgent01(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files    = req.files as Record<string, Express.Multer.File[]> | undefined;
  const moveIns  = files?.move_in  ?? [];
  const moveOuts = files?.move_out ?? [];
  try {
    const body = agent01BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('claims', body.claims);
    moveIns.forEach(f  => appendFile(fd, 'move_in',  f));
    moveOuts.forEach(f => appendFile(fd, 'move_out', f));
    const data = await postMultipart('agent01', '/api/v1/agent01', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(...moveIns, ...moveOuts);
  }
}

export async function runAgent02(req: Request, res: Response, next: NextFunction): Promise<void> {
  const contractFile = req.file;
  try {
    const body = agent02BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('claims',          body.claims);
    fd.append('contract_clause', body.contract_clause);
    fd.append('lease_start',     body.lease_start);
    fd.append('lease_end',       body.lease_end);
    fd.append('deposit_amount',  body.deposit_amount);
    fd.append('monthly_rent',    body.monthly_rent);
    appendFile(fd, 'contract_file', contractFile);
    const data = await postMultipart('agent02', '/api/v1/agent02', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(contractFile);
  }
}

export async function runAgent03(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = agent03BodySchema.parse(req.body);
    const data = await postJSON('agent03', '/api/v1/agent03', body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function runAgent04(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = agent04BodySchema.parse(req.body);
    const data = await postJSON('agent04', '/api/v1/agent04', body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
