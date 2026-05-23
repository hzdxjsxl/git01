'use strict';

const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const PORT = 8899;
  const server = spawn('node', ['server.js'], { cwd: __dirname, stdio: 'pipe', env: { ...process.env, PORT: String(PORT) } });
  
  let serverLog = '';
  server.stdout.on('data', d => { serverLog += d.toString(); });
  server.stderr.on('data', d => { serverLog += d.toString(); });

  await sleep(2500);
  
  console.log('Server log:');
  console.log(serverLog);

  if (serverLog.indexOf('listening') === -1) {
    console.log('Server failed to start');
    server.kill();
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE: ' + err.message));

  console.log('\nLoading page...');
  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Timeout or error (expected for large payload): ' + e.message);
  }

  await sleep(4000);

  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  const stats = await page.evaluate(() => {
    const el = (id) => document.getElementById(id);
    return {
      total: el('s-total')?.textContent,
      depth: el('s-depth')?.textContent,
      draw: el('s-draw')?.textContent,
      edge: el('s-edge')?.textContent,
      fps: el('s-fps')?.textContent,
      scale: el('s-scale')?.textContent,
      overlayHidden: el('overlay')?.classList.contains('hide'),
      canvasExists: !!el('canvas'),
    };
  });

  console.log('\n=== Page Stats ===');
  console.log(JSON.stringify(stats, null, 2));

  const ssDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
  await page.screenshot({ path: path.join(ssDir, 'overview.png'), fullPage: false });
  console.log('Saved: screenshots/overview.png');

  const success = stats.canvasExists && stats.overlayHidden && parseInt(stats.draw) > 0 && parseInt(stats.edge) > 0;
  console.log('\n=== VERDICT: ' + (success ? 'SUCCESS' : 'FAIL') + ' ===');

  await browser.close();
  server.kill();
  process.exit(success ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
