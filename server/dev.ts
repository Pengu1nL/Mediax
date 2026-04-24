import { spawn } from 'node:child_process';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const binExtension = isWindows ? '.cmd' : '';

function localBin(name: string): string {
  return path.resolve(process.cwd(), 'node_modules', '.bin', `${name}${binExtension}`);
}

function startProcess(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[dev] ${name} exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  });

  return child;
}

let shuttingDown = false;
const children = [
  startProcess('api server', localBin('tsx'), ['watch', 'server/index.ts'], {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@mediax.local',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'mediax2026',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-only-mediax-secret',
    SERVER_PORT: process.env.SERVER_PORT || '3001',
  }),
  startProcess('vite', localBin('vite'), ['--port=3000', '--host=0.0.0.0']),
];

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = exitCode;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
