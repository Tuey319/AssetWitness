@echo off
echo Starting RoomWitness backend services...

:: Agent 01 - CV (port 8001)
start "Agent 01 - CV" cmd /k "cd /d %~dp0roomwitness-rag && python -m uvicorn services.agent01_service:app --port 8001 --reload"

:: Agent 02 - Contract Parser (port 8002)
start "Agent 02 - Contract" cmd /k "cd /d %~dp0roomwitness-rag && python -m uvicorn services.agent02_service:app --port 8002 --reload"

:: Agent 03 - Legal Reasoning (port 8003)
start "Agent 03 - Legal RAG" cmd /k "cd /d %~dp0roomwitness-rag && python -m uvicorn services.agent03_service:app --port 8003 --reload"

:: Agent 04 - Document Generator (port 8004)
start "Agent 04 - Docs" cmd /k "cd /d %~dp0roomwitness-rag && python -m uvicorn services.agent04_service:app --port 8004 --reload"

:: Express gateway (port 3001)
start "Express Gateway" cmd /k "cd /d %~dp0express-backend && npm run dev"

:: Next.js web frontend (port 3000)
start "Web Frontend" cmd /k "cd /d %~dp0nextjs-frontend && npm run dev"

echo.
echo All services starting in separate windows:
echo   Agent 01 CV       -> http://localhost:8001
echo   Agent 02 Contract -> http://localhost:8002
echo   Agent 03 Legal    -> http://localhost:8003
echo   Agent 04 Docs     -> http://localhost:8004
echo   Express Gateway   -> http://localhost:3001
echo   Web Frontend      -> http://localhost:3000
echo.
echo To run mobile app: cd roomwitness-app, then: npx expo start --clear
pause
