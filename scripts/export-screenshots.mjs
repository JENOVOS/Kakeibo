import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

/**
 * ストア用スクリーンショットを PNG に書き出す。
 *
 * DevTools の「Capture node screenshot」は
 * 出力サイズが「CSSサイズ × devicePixelRatio × ページ拡大率」になるため、
 * 環境によって寸法がずれる。App Store Connect は寸法が1pxでも違うと受け付けないので、
 * deviceScaleFactor を 1 に固定したブラウザで機械的に書き出す。
 *
 * 端末にすでに入っている Chrome を使う（puppeteer 同梱の Chromium は落とさない）。
 */

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

/** 各サイズの CSS クラスと、書き出し先のフォルダ名 */
const SIZES = {
  s65: { label: '6.5inch-1242x2688', w: 1242, h: 2688 },
  s67: { label: '6.7inch-1284x2778', w: 1284, h: 2778 },
  s69: { label: '6.9inch-1290x2796', w: 1290, h: 2796 },
};

const SCREENS = ['1-home', '2-entry', '3-budget', '4-recurring', '5-savings', '6-report'];

const OUT = resolve('docs/store/screenshots');
const SRC = resolve('docs/store/screenshots.html');

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => p && existsSync(p));
  if (!found) {
    console.error('Chrome が見つかりません。CHROME_CANDIDATES にパスを足してください。');
    process.exit(1);
  }
  return found;
}

/** PNG の IHDR から実際の幅・高さを読む（書き出せたと信じずに確かめる） */
function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  // 拡大率の影響を受けないよう、ピクセル比を 1 に固定する
  await page.setViewport({ width: 1400, height: 1200, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(SRC).href, { waitUntil: 'networkidle0' });
  // Web フォント（Manrope / Material Symbols）の読み込みを待つ
  await page.evaluate(() => document.fonts.ready);

  rmSync(OUT, { recursive: true, force: true });

  const results = [];

  for (const [cls, size] of Object.entries(SIZES)) {
    const dir = join(OUT, size.label);
    mkdirSync(dir, { recursive: true });

    const handles = await page.$$(`.shot.${cls}`);
    if (handles.length !== SCREENS.length) {
      console.error(
        `${size.label}: アートボードが ${handles.length} 枚しかありません（${SCREENS.length} 枚必要）`,
      );
      process.exitCode = 1;
      continue;
    }

    for (let i = 0; i < handles.length; i++) {
      const file = join(dir, `${SCREENS[i]}.png`);
      await handles[i].screenshot({ path: file, captureBeyondViewport: true });
      const actual = pngSize(file);
      const ok = actual.w === size.w && actual.h === size.h;
      results.push({ file, actual, expected: size, ok });
      if (!ok) process.exitCode = 1;
    }
  }

  console.log('書き出し結果:\n');
  let lastDir = '';
  for (const r of results) {
    const dir = r.file.slice(OUT.length + 1).split(/[\\/]/)[0];
    if (dir !== lastDir) {
      console.log(`  [${dir}]`);
      lastDir = dir;
    }
    const name = r.file.split(/[\\/]/).pop();
    const kb = Math.round(statSync(r.file).size / 1024);
    console.log(
      `    ${r.ok ? 'OK  ' : 'NG  '} ${name.padEnd(16)} ${r.actual.w}x${r.actual.h}` +
        (r.ok ? ` (${kb}KB)` : ` ← ${r.expected.w}x${r.expected.h} のはず`),
    );
  }

  const bad = results.filter((r) => !r.ok).length;
  console.log(
    bad === 0
      ? `\n${results.length} 枚すべて指定どおりの寸法です。`
      : `\n${bad} 枚が指定と違う寸法です。`,
  );
} finally {
  await browser.close();
}
