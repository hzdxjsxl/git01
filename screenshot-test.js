'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE: ' + err.message));

  console.log('Loading page...');
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Timeout or error, but continuing...');
  }

  await new Promise(r => setTimeout(r, 5000));

  if (errors.length) {
    console.log('ERRORS:', errors);
  }

  const stats = await page.evaluate(() => {
    return {
      total: document.getElementById('s-total')?.textContent,
      depth: document.getElementById('s-depth')?.textContent,
      draw: document.getElementById('s-draw')?.textContent,
      edge: document.getElementById('s-edge')?.textContent,
      fps: document.getElementById('s-fps')?.textContent,
      scale: document.getElementById('s-scale')?.textContent,
      overlayHidden: document.getElementById('overlay')?.classList.contains('hide'),
      canvasExists: !!document.getElementById('canvas'),
      canvasWidth: document.getElementById('canvas')?.width,
      canvasHeight: document.getElementById('canvas')?.height,
    };
  });

  console.log('\n=== Page Stats ===');
  console.log(JSON.stringify(stats, null, 2));

  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  await page.screenshot({ path: path.join(screenshotDir, 'overview.png'), fullPage: false });
  console.log('Saved: screenshots/overview.png');

  if (stats.overlayHidden && stats.draw && parseInt(stats.draw) > 0) {
    console.log('\n=== VERDICT: SUCCESS ===');
    console.log(`Rendered ${stats.draw} nodes and ${stats.edge} edges`);
  } else {
    console.log('\n=== VERDICT: FAIL ===');
    console.log('Tree not rendered properly');
  }

  await browser.close();
}

main().catch(console.error);
