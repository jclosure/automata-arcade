#!/usr/bin/env node
/**
 * capture.js — headless Puppeteer screen capture for Automata Arcade hero GIF
 * Usage: node capture.js
 * Outputs: docs/media/hero.gif, docs/media/hero-still.png
 */
const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 5174;
const BASE = `http://localhost:${PORT}`;
const FRAMES_DIR = path.join(__dirname, '__capture_frames__');
const OUT_GIF = path.join(__dirname, 'docs/media/hero.gif');
const OUT_STILL = path.join(__dirname, 'docs/media/hero-still.png');

// Capture config
const VIEWPORT_W = 1280;
const VIEWPORT_H = 740;
const FPS = 12;
const FRAME_INTERVAL_MS = Math.round(1000 / FPS);
const WARMUP_MS = 1400;    // let demo run before recording (catch peak crossfire)
const RECORD_MS = 8000;    // record duration
const GIF_W = 780;         // output width (height auto)

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Clean up and create frames dir
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR);

  // Start server
  console.log('Starting server...');
  const server = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    cwd: __dirname,
  });
  server.stderr.on('data', d => process.stderr.write(d));
  await sleep(800);

  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: 2 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
      ],
    });

    const page = await browser.newPage();
    page.on('console', m => {
      if (m.type() === 'error') console.error('[browser]', m.text());
    });

    console.log(`Navigating to ${BASE}...`);
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    await sleep(600);

    // Load demo (dual Gosper Glider Gun crossfire)
    console.log('Loading demo...');
    await page.click('#demoBtn');
    await sleep(400);

    // Enable trails with long decay for beautiful glider path streaks
    await page.evaluate(() => {
      const cb = document.getElementById('showTrails');
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
      const decay = document.getElementById('trailDecay');
      if (decay) { decay.value = 0.96; decay.dispatchEvent(new Event('input')); }
    });
    await sleep(100);

    // Start simulation
    console.log('Starting simulation...');
    await page.click('#playBtn');
    await sleep(200);

    // Speed to max for fast warmup
    await page.evaluate(() => {
      const slider = document.getElementById('speedInput');
      if (slider) { slider.value = 30; slider.dispatchEvent(new Event('input')); }
    });
    await sleep(100);

    // Let simulation warm up — produces a field of gliders
    console.log(`Warming up for ${WARMUP_MS}ms...`);
    await sleep(WARMUP_MS);

    // Drop to a moderate speed for recording
    await page.evaluate(() => {
      const slider = document.getElementById('speedInput');
      if (slider) { slider.value = 8; slider.dispatchEvent(new Event('input')); }
    });
    await sleep(200);

    // Capture the hero still first (after warmup, before recording)
    console.log('Capturing hero still...');
    const stillShot = await page.screenshot({ type: 'png' });
    fs.writeFileSync(OUT_STILL, stillShot);
    console.log(`Saved ${OUT_STILL}`);

    // Record frames
    const totalFrames = Math.ceil(RECORD_MS / FRAME_INTERVAL_MS);
    console.log(`Recording ${totalFrames} frames at ${FPS}fps...`);

    for (let i = 0; i < totalFrames; i++) {
      const t0 = Date.now();
      const frame = await page.screenshot({ type: 'png', optimizeForSpeed: true });
      const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
      fs.writeFileSync(framePath, frame);
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, FRAME_INTERVAL_MS - elapsed);
      if (wait > 0) await sleep(wait);
      if ((i + 1) % 15 === 0) process.stdout.write(`  frame ${i + 1}/${totalFrames}\n`);
    }
    console.log('Recording complete.');

  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  // Convert frames to GIF with ffmpeg (two-pass palette for quality)
  console.log('Converting frames to GIF with ffmpeg...');
  const inputPattern = path.join(FRAMES_DIR, 'frame_%04d.png');
  const paletteFile = path.join(FRAMES_DIR, 'palette.png');

  // Pass 1: generate palette
  execSync(
    `ffmpeg -y -r ${FPS} -i "${inputPattern}" ` +
    `-vf "scale=${GIF_W}:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" ` +
    `"${paletteFile}"`,
    { stdio: 'inherit' }
  );

  // Pass 2: render GIF
  execSync(
    `ffmpeg -y -r ${FPS} -i "${inputPattern}" -i "${paletteFile}" ` +
    `-lavfi "scale=${GIF_W}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" ` +
    `-loop 0 "${OUT_GIF}"`,
    { stdio: 'inherit' }
  );

  // Cleanup
  fs.rmSync(FRAMES_DIR, { recursive: true });

  const gifStat = fs.statSync(OUT_GIF);
  console.log(`\nDone!`);
  console.log(`  hero.gif    → ${OUT_GIF} (${(gifStat.size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`  hero-still  → ${OUT_STILL}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
