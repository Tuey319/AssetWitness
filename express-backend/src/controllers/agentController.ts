import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import {
  agent01BodySchema,
  agent02BodySchema,
  agent03BodySchema,
  agent04BodySchema,
  generateDocumentsBodySchema,
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
  const files        = req.files as Record<string, Express.Multer.File[]> | undefined;
  const contractFile = files?.contract_file?.[0];
  const screenshots  = files?.screenshots ?? [];
  try {
    const body = agent02BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('claims',                   body.claims);
    fd.append('contract_clause',          body.contract_clause);
    fd.append('lease_start',              body.lease_start);
    fd.append('lease_end',                body.lease_end);
    fd.append('deposit_amount',           body.deposit_amount);
    fd.append('monthly_rent',             body.monthly_rent);
    fd.append('manual_landlord_promises', body.manual_landlord_promises);
    fd.append('manual_tenant_promises',   body.manual_tenant_promises);
    appendFile(fd, 'contract_file', contractFile);
    screenshots.forEach(f => appendFile(fd, 'screenshots', f));
    const data = await postMultipart('agent02', '/api/v1/agent02', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(contractFile, ...screenshots);
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

export async function generateDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = generateDocumentsBodySchema.parse(req.body);
    const data = await postJSON('agent04', '/api/v1/agent04', body) as {
      case_id?: string;
      documents?: Record<string, { download_url?: string }>;
    };
    // Agent 04 returns agent-internal download paths — rewrite them to this
    // proxy's absolute URL so mobile clients can open them directly.
    if (data?.case_id && data?.documents) {
      const base = `${req.protocol}://${req.get('host')}`;
      for (const [docType, doc] of Object.entries(data.documents)) {
        doc.download_url = `${base}/download/${data.case_id}/${docType}`;
      }
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}
