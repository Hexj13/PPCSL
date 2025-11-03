# Project Restart Instructions

## Full Restart

### 1. Stop all processes (if running)

If processes are running in terminal, press `Ctrl+C` in each window.

Or find and stop processes:
```bash
# Find processes on ports
lsof -ti:3000 | xargs kill -9 2>/dev/null  # Frontend
lsof -ti:4000 | xargs kill -9 2>/dev/null  # Backend
```

### 2. Install/update dependencies (if needed)

```bash
# In project root
npm run install:all
```

Or separately:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Ensure database is running

```bash
docker-compose up -d
```

### 4. Create uploads folder (if not created)

```bash
mkdir -p backend/uploads
```

### 5. Start the project

**Option 1: Start both servers simultaneously**
```bash
# In project root
npm run dev
```

**Option 2: Start separately**

Terminal 1 (Backend):
```bash
cd backend
npm run start:dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 6. Verify operation

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API check: http://localhost:4000 (should show "Kupito API v1.0")

## Quick Restart (if already running)

If you just need to restart after changes:

1. In terminal where backend is running: `Ctrl+C`, then `npm run start:dev`
2. In terminal where frontend is running: `Ctrl+C`, then `npm run dev`

Or simply use `npm run dev` in root - it will start both servers.
