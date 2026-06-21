const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/run/agent01',       require('./routes/agent01'));
app.use('/run/agent02',       require('./routes/agent02'));
app.use('/run/agent03',       require('./routes/agent03'));
app.use('/run/agent04',       require('./routes/agent04'));
app.use('/extract-contract',  require('./routes/extract'));

app.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${process.env.AGENT03_URL}/health`, { timeout: 2000 });
    res.json({ status: 'ok', corpus_loaded: data.corpus_ready ?? false });
  } catch {
    res.json({ status: 'ok', corpus_loaded: false });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`RoomWitness Express running on http://localhost:${process.env.PORT || 3000}`);
});
