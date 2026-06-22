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
  const files  = req.files as Record<string, Express.Multer.File[]> | undefined;
  const moveIn  = files?.move_in?.[0];
  const moveOut = files?.move_out?.[0];
  try {
    const body = agent01BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('claims', body.claims);
    appendFile(fd, 'move_in',  moveIn);
    appendFile(fd, 'move_out', moveOut);
    const data = await postMultipart('agent01', '/api/v1/agent01', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(moveIn, moveOut);
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
