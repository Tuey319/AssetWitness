import { Router } from 'express';
import axios from 'axios';
import { config } from '../config';
import upload, { agent01Fields, agent02Fields, fullAnalysisFields } from '../middleware/upload';
import * as agentController from '../controllers/agentController';
import * as extractController from '../controllers/extractController';
import { runFullAnalysis } from '../controllers/fullAnalysisController';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const { data } = await axios.get<{ corpus_ready?: boolean }>(
      `${config.agents.agent03}/health`,
      { timeout: 2000 },
    );
    res.json({ status: 'ok', corpus_loaded: data.corpus_ready ?? false });
  } catch {
    res.json({ status: 'ok', corpus_loaded: false });
  }
});

router.post('/run/agent01', upload.fields(agent01Fields), agentController.runAgent01);
router.post('/run/agent02', upload.fields(agent02Fields), agentController.runAgent02);
router.post('/run/agent03', agentController.runAgent03);
router.post('/run/agent04', agentController.runAgent04);

router.post('/generate-documents', agentController.generateDocuments);

router.get('/download/:caseId/:docType', async (req, res, next) => {
  try {
    const { caseId, docType } = req.params;
    const url = `${config.agents.agent04}/api/v1/download/${encodeURIComponent(caseId)}/${encodeURIComponent(docType)}`;
    const response = await axios.get(url, { responseType: 'stream' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${docType}_${caseId}.pdf"`);
    (response.data as NodeJS.ReadableStream).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.post('/extract-contract', upload.single('contract_file'), extractController.extractContract);

router.post('/full-analysis', upload.fields(fullAnalysisFields), runFullAnalysis);

export default router;
