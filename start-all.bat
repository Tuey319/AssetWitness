@echo off
echo Starting AssetWitness backend services...

:: Agent 01 - Condition Comparison (port 8001)
start "Agent 01 - Condition" cmd /k "cd /d %~dp0assetwitness-pipeline && python -m uvicorn services.agent01_service:app --port 8001 --reload"

:: Agent 02 - Agreement Parser (port 8002)
start "Agent 02 - Agreement" cmd /k "cd /d %~dp0assetwitness-pipeline && python -m uvicorn services.agent02_service:app --port 8002 --reload"

:: Agent 03 - Asset Policy Reasoning (port 8003)
start "Agent 03 - Policy RAG" cmd /k "cd /d %~dp0assetwitness-pipeline && python -m uvicorn services.agent03_service:app --port 8003 --reload"

:: Agent 04 - Report Generator (port 8004)
start "Agent 04 - Reports" cmd /k "cd /d %~dp0assetwitness-pipeline && python -m uvicorn services.agent04_service:app --port 8004 --reload"

:: Express gateway (port 3001)
start "Express Gateway" cmd /k "cd /d %~dp0express-backend && npm run dev"

:: Next.js web frontend (port 3000)
start "Web Frontend" cmd /k "cd /d %~dp0nextjs-frontend && npm run dev"

echo.
echo All services starting in separate windows:
echo   Agent 01 Condition -> http://localhost:8001
echo   Agent 02 Agreement -> http://localhost:8002
echo   Agent 03 Policy    -> http://localhost:8003
echo   Agent 04 Reports   -> http://localhost:8004
echo   Express Gateway    -> http://localhost:3001
echo   Web Frontend       -> http://localhost:3000
echo.
echo Note: Postgres for the Portfolio Condition Dashboard is not started by this
echo script — run "cd express-backend && npm run db:up" first if it isn't already up.
echo To run mobile app: cd assetwitness-app, then: npx expo start --clear
pause
