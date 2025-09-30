#!/usr/bin/env node
// Start both price server and frontend dev server on free ports and print URLs
import { spawn } from 'child_process';
import getPort from 'get-port';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

// Load environment variables from repo root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.CRYPTO_API) {
  console.warn('⚠️  CRYPTO_API not found in environment. Price fetching may fail.');
} else {
  console.log('✅ CRYPTO_API loaded for price server');
}

async function main() {
  // get-port v6 doesn't expose makeRange helper; create a simple range array
  const rangeArray = (start, end) => {
    const arr = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  };

  const pricePort = await getPort({ port: rangeArray(3000, 3100) });
  const clientPort = await getPort({ port: rangeArray(5173, 5200) });

  console.log(`Using price server port: ${pricePort}`);
  console.log(`Using client dev port: ${clientPort}`);

  // Start price server
  const priceEnv = { ...process.env, PRICE_SERVER_PORT: String(pricePort) };
  const priceProc = spawn(process.platform === 'win32' ? 'node.exe' : 'node', ['src/priceServerFastify.js'], {
    cwd: path.resolve(process.cwd(), 'price-ingest'),
    env: priceEnv,
    stdio: 'inherit'
  });

  // Start client (Vite) with PORT env
  const clientEnv = { ...process.env, PORT: String(clientPort), VITE_DEV_PORT: String(clientPort) };
  const clientProc = spawn(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/c','npm','run','dev'] : ['run','dev'], {
    cwd: path.resolve(process.cwd(), 'client'),
    env: clientEnv,
    stdio: 'inherit'
  });

  // Forward signals
  const forward = (sig) => {
    priceProc.kill(sig);
    clientProc.kill(sig);
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  // Exit handling
  priceProc.on('exit', (code) => {
    console.log(`Price server exited with ${code}`);
    clientProc.kill();
    process.exit(code || 0);
  });
  clientProc.on('exit', (code) => {
    console.log(`Client dev server exited with ${code}`);
    priceProc.kill();
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});