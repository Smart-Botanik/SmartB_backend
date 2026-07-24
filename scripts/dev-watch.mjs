/**
 * Nest `start --watch` uses TypeScript's classic compiler API
 * (`getParsedCommandLineOfConfigFile`), which TypeScript 7 removed.
 * Dev watch = tsc --watch + node --watch until Nest CLI supports TS 7.1+.
 * @see ADR-0017 / TS-MIG-1
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Prefer PATH `tsc` (npm bin link); avoids TS7 `exports` blocking `require.resolve('typescript/bin/tsc')`. */
function runTsc(tscArgs, opts = {}) {
  return spawn('npx', ['tsc', ...tscArgs], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

function runNode(nodeArgs, opts = {}) {
  return spawn(process.execPath, nodeArgs, {
    cwd: root,
    stdio: 'inherit',
    ...opts,
  });
}

const initial = runTsc(['-p', 'tsconfig.json']);
initial.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);

  const watch = runTsc(['-p', 'tsconfig.json', '--watch', '--preserveWatchOutput']);
  const app = runNode(['--watch', 'dist/main.js']);

  const stop = () => {
    watch.kill();
    app.kill();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  app.on('exit', (appCode) => {
    watch.kill();
    process.exit(appCode ?? 0);
  });
});
