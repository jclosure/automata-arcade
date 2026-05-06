import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5173';
const OUT = './docs/media/screens';
const W = 1440, H = 900;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

await page.goto(BASE, { waitUntil: 'networkidle0' });
await wait(2000); // let demo load

// 1 — Full app overview (demo loaded)
await page.screenshot({ path: `${OUT}/01-overview.png` });
console.log('01 done');

// 2 — Open notebook panel, show empty state
await page.click('#notebookBtn');
await wait(400);
await page.screenshot({ path: `${OUT}/02-notebook-empty.png` });
console.log('02 done');

// 3 — Create a notebook entry
await page.click('#nbNewBtn');
await wait(200);
await page.type('#nbTitleInput', 'Dual Gosper gun crossfire');
await page.click('#nbBodyInput');
await page.type('#nbBodyInput', 'Two guns aimed at each other. Watch the gliders annihilate at the midpoint every 30 generations. This is the NOT gate in action.');
await wait(100);
await page.screenshot({ path: `${OUT}/03-notebook-form.png` });
console.log('03 done');

// Save the entry
await page.click('#nbSaveBtn');
await wait(400);
await page.screenshot({ path: `${OUT}/04-notebook-entry.png` });
console.log('04 done');

// 4 — Add a second auto entry by running sim for a bit
await page.click('#playBtn');
await wait(3500);
await page.click('#playBtn');
await wait(200);
await page.screenshot({ path: `${OUT}/05-notebook-auto-feed.png` });
console.log('05 done');

// 5 — Close notebook, show timeline markers
await page.click('#nbCloseBtn');
await wait(300);
// Add another entry manually to get 2 markers on timeline
await page.click('#notebookBtn');
await wait(200);
await page.click('#nbNewBtn');
await wait(150);
await page.type('#nbTitleInput', 'Streams at peak population');
await page.click('#nbSaveBtn');
await wait(300);
await page.click('#nbCloseBtn');
await wait(300);
await page.screenshot({ path: `${OUT}/06-timeline-markers.png` });
console.log('06 done');

// 6 — Zoom in on the timeline area
const tlEl = await page.$('#timelineBar');
const tlBox = await tlEl.boundingBox();
await page.screenshot({
  path: `${OUT}/07-timeline-zoom.png`,
  clip: { x: tlBox.x - 10, y: tlBox.y - 20, width: tlBox.width + 20, height: tlBox.height + 40 }
});
console.log('07 done');

// 7 — Show mode toolbar
const ctrlEl = await page.$('.controls-row');
const ctrlBox = await ctrlEl.boundingBox();
await page.screenshot({
  path: `${OUT}/08-mode-toolbar.png`,
  clip: { x: ctrlBox.x, y: ctrlBox.y, width: ctrlBox.width, height: ctrlBox.height }
});
console.log('08 done');

// 8 — Select mode: click S key
await page.keyboard.press('KeyS');
await wait(200);
await page.screenshot({ path: `${OUT}/09-select-mode.png`,
  clip: { x: ctrlBox.x, y: ctrlBox.y, width: ctrlBox.width, height: ctrlBox.height }
});
await page.keyboard.press('Escape');
console.log('09 done');

// 9 — Switch to torus mode
await page.select('#modeSelect', 'torus');
await wait(1200);
await page.screenshot({ path: `${OUT}/10-torus.png` });
console.log('10 done');

// 10 — Switch back to sandbox, open notebook for pin demo
await page.select('#modeSelect', 'sandbox');
await wait(800);
await page.click('#demoBtn');
await wait(1500);
await page.click('#notebookBtn');
await wait(300);
// Open form, enter text to look like a pin is pending
await page.click('#nbNewBtn');
await wait(200);
await page.type('#nbTitleInput', 'Gosper gun — left station');
await page.type('#nbBodyInput', 'Fires SE gliders every 30 generations. The stream hits the eater on the right, which absorbs every packet without dying.');
await page.screenshot({ path: `${OUT}/11-notebook-with-form.png` });
console.log('11 done');
await page.keyboard.press('Escape');

// 11 — Arcade mode
await page.click('#nbCloseBtn');
await wait(200);
await page.select('#modeSelect', 'arcade');
await wait(500);
await page.select('#levelSelect', '0');
await wait(200);
await page.click('#startLevelBtn');
await wait(1000);
await page.screenshot({ path: `${OUT}/12-arcade-level.png` });
console.log('12 done');

// 12 — Circuit Academy
await page.select('#modeSelect', 'arcade');
await wait(300);
// Find CA level (circuit academy starts at index 5 in LEVELS — L1..L5 then CA-1..CA-7)
const levelSel = await page.$eval('#levelSelect', el => {
  const opts = [...el.options];
  const ca = opts.findIndex(o => o.text.includes('CA-1'));
  return ca;
});
await page.evaluate(idx => {
  const sel = document.getElementById('levelSelect');
  sel.selectedIndex = idx;
  sel.dispatchEvent(new Event('change'));
}, levelSel);
await wait(200);
await page.click('#startLevelBtn');
await wait(1000);
await page.screenshot({ path: `${OUT}/13-circuit-academy.png` });
console.log('13 done');

// 13 — Guide card close-up
const guideEl = await page.$('#guideCard');
if (guideEl) {
  const guideBox = await guideEl.boundingBox();
  if (guideBox) {
    await page.screenshot({
      path: `${OUT}/14-guide-card.png`,
      clip: { x: guideBox.x - 10, y: guideBox.y - 10, width: guideBox.width + 20, height: guideBox.height + 20 }
    });
  }
}
console.log('14 done');

// 14 — Prefab palette close-up
await page.select('#modeSelect', 'sandbox');
await wait(400);
await page.click('#demoBtn');
await wait(1000);
const paletteEl = await page.$('#palettePanel');
const paletteBox = await paletteEl.boundingBox();
await page.screenshot({
  path: `${OUT}/15-palette.png`,
  clip: { x: paletteBox.x, y: paletteBox.y, width: paletteBox.width, height: Math.min(paletteBox.height, 600) }
});
console.log('15 done');

// 15 — Inspector / Rule Lab
const inspEl = await page.$('#inspectorPanel');
const inspBox = await inspEl.boundingBox();
await page.screenshot({
  path: `${OUT}/16-inspector.png`,
  clip: { x: inspBox.x, y: inspBox.y, width: inspBox.width, height: Math.min(inspBox.height, 700) }
});
console.log('16 done');

// 16 — Full notebook open with entries (reopen)
await page.click('#notebookBtn');
await wait(300);
await page.screenshot({ path: `${OUT}/17-notebook-full.png` });
console.log('17 done');

// 17 — Mark entry as scene
const sceneAct = await page.$('.nb-scene-act');
if (sceneAct) {
  await sceneAct.click();
  await wait(200);
  await page.screenshot({ path: `${OUT}/18-notebook-scene-marked.png` });
}
console.log('18 done');

await browser.close();
console.log('All screenshots done!');
