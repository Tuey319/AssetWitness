const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const config   = require('../config');

/**
 * POST multipart/form-data to a Python agent service.
 * @param {string} agentKey - key in config.agents (agent01 | agent02 | ...)
 * @param {string} endpoint - e.g. '/api/v1/agent01'
 * @param {FormData} fd - populated FormData instance
 */
async function postMultipart(agentKey, endpoint, fd) {
  const url = `${config.agents[agentKey]}${endpoint}`;
  const { data } = await axios.post(url, fd, {
    headers: fd.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
}

/**
 * POST JSON body to a Python agent service.
 * @param {string} agentKey
 * @param {string} endpoint
 * @param {object} body
 */
async function postJSON(agentKey, endpoint, body) {
  const url = `${config.agents[agentKey]}${endpoint}`;
  const { data } = await axios.post(url, body);
  return data;
}

/**
 * Append an uploaded file to a FormData instance.
 * @param {FormData} fd
 * @param {string} fieldName
 * @param {object} multerFile - req.file or req.files[fieldName][0]
 */
function appendFile(fd, fieldName, multerFile) {
  if (!multerFile) return;
  fd.append(fieldName, fs.createReadStream(multerFile.path), multerFile.originalname);
}

/**
 * Delete temp files uploaded by multer.
 * @param {...object} files
 */
function cleanupFiles(...files) {
  for (const f of files) {
    if (!f) continue;
    try { fs.unlinkSync(f.path); } catch {}
  }
}

module.exports = { postMultipart, postJSON, appendFile, cleanupFiles };
