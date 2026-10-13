import { spawn } from 'node:child_process';

// El iniciador controla el teclado; los servidores solo comparten la salida.
const children = ['frontend', 'backend'].map(workspace =>
  spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev', '--workspace', workspace], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: process.platform !== 'win32',
  }),
);
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
  await Promise.all(children.map(child => new Promise(resolve => {
    if (!child.pid) return resolve();
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      killer.on('close', resolve);
      killer.on('error', resolve);
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Ya terminó. */ }
      resolve();
    }
  })));
  process.exit(code);
}
for (const child of children) {
  child.on('error', error => { console.error(error); void stop(1); });
  child.on('exit', code => { void stop(code ?? 1); });
}
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', data => {
    if (data.includes(3) || data.toString().toLowerCase().includes('q')) void stop();
  });
}
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
console.log('Para detener frontend y backend: Ctrl+C o Q.');
