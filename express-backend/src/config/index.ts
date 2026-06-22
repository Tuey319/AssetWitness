import dotenv from 'dotenv';
dotenv.config();

const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '20', 10);

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
  agents: {
    agent01: process.env.AGENT_01_URL ?? 'http://localhost:8001',
    agent02: process.env.AGENT_02_URL ?? 'http://localhost:8002',
    agent03: process.env.AGENT_03_URL ?? 'http://localhost:8003',
    agent04: process.env.AGENT_04_URL ?? 'http://localhost:8004',
  },
} as const;

export type AgentKey = keyof typeof config.agents;
