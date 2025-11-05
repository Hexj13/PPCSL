#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

const ports = process.argv.slice(2).map(Number).filter(Boolean);

if (ports.length === 0) {
  console.log('No ports specified');
  process.exit(0);
}

const platform = os.platform();

ports.forEach((port) => {
  try {
    if (platform === 'win32') {
      const findProcess = `netstat -ano | findstr :${port}`;
      const result = execSync(findProcess, { encoding: 'utf-8', stdio: 'pipe' });
      const lines = result.trim().split('\n').filter((line) => line.trim());
      if (lines.length === 0) {
        console.log(`✓ Port ${port} is already free`);
        return;
      }
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`✓ Killed process ${pid} on port ${port}`);
          } catch (e) {
            // Process might already be dead
          }
        }
      });
    } else {
      const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (pids) {
        pids.split('\n').forEach((pid) => {
          if (pid.trim()) {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
              console.log(`✓ Killed process ${pid} on port ${port}`);
            } catch (e) {
              // Process might already be dead
            }
          }
        });
      } else {
        console.log(`✓ Port ${port} is already free`);
      }
    }
  } catch (error) {
    // Port is not in use, which is fine
    console.log(`✓ Port ${port} is already free`);
  }
});

console.log('Port cleanup completed');

