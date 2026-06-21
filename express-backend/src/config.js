require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  agents: {
    agent01: process.env.AGENT01_URL || 'http://localhost:8001',
    agent02: process.env.AGENT02_URL || 'http://localhost:8002',
    agent03: process.env.AGENT03_URL || 'http://localhost:8003',
    agent04: process.env.AGENT04_URL || 'http://localhost:8004',
  },
};
