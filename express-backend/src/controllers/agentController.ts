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
  const files          = req.files as Record<string, Express.Multer.File[]> | undefined;
  const priorPhotos     = files?.prior_condition   ?? [];
  const currentPhotos   = files?.current_condition ?? [];
  try {
    const body = agent01BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('condition_items', body.condition_items);
    priorPhotos.forEach(f   => appendFile(fd, 'prior_condition',   f));
    currentPhotos.forEach(f => appendFile(fd, 'current_condition', f));
    const data = await postMultipart('agent01', '/api/v1/agent01', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(...priorPhotos, ...currentPhotos);
  }
}

export async function runAgent02(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files         = req.files as Record<string, Express.Multer.File[]> | undefined;
  const agreementFile = files?.agreement_file?.[0];
  try {
    const body = agent02BodySchema.parse(req.body);
    const fd = new FormData();
    fd.append('condition_items',  body.condition_items);
    fd.append('agreement_clause', body.agreement_clause);
    fd.append('occupancy_start',  body.occupancy_start);
    fd.append('occupancy_end',    body.occupancy_end);
    fd.append('monthly_fee',      body.monthly_fee);
    appendFile(fd, 'agreement_file', agreementFile);
    const data = await postMultipart('agent02', '/api/v1/agent02', fd);
    res.json(data);
  } catch (err) {
    next(err);
  } finally {
    cleanupFiles(agreementFile);
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
      handover_id?: string;
      documents?: Record<string, { download_url?: string }>;
    };
    // Agent 04 returns agent-internal download paths — rewrite them to this
    // proxy's absolute URL so mobile clients can open them directly.
    if (data?.handover_id && data?.documents) {
      const base = `${req.protocol}://${req.get('host')}`;
      for (const [docType, doc] of Object.entries(data.documents)) {
        doc.download_url = `${base}/download/${data.handover_id}/${docType}`;
      }
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}
