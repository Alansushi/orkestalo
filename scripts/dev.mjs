import { spawn } from 'node:child_process';

const server = spawn('vercel', ['dev', ...process.argv.slice(2)], { stdio: 'inherit' });
server.on('error', (error) => {
  console.error(`Could not start Vercel CLI: ${error.message}`);
  process.exitCode = 1;
});
server.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
