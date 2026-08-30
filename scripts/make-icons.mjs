import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import zlib from 'node:zlib';
import puppeteer from 'puppeteer-core';

/**
 * アプリアイコンを SVG から PNG に書き出す。
 *
 * App Store は **アルファチャンネルを含むアイコンを受け付けない**（透過が無くても、
 * チャンネルが存在するだけで弾かれる）。ブラウザのスクリーンショットは常に RGBA を
 * 吐くため、ここではキャンバスから生ピクセルを取り出し、
 * アイコン本体だけ RGB（カラータイプ2）で自前エンコードしている。
 *
 * Android のアダプティブアイコンは外周が切られるので、
 * 図柄は中央 66% ほどに収める必要がある。
 */

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

const GRAD = `<defs><linearGradient id="bg" x1="0.15" y1="0" x2="0.85" y2="1">
  <stop offset="0" stop-color="#3BA6E4"/><stop offset="1" stop-color="#0E6FAF"/>
</linearGradient></defs>`;

/** 予算の消化リング。円周 2πr のうち約72%を白で描く */
const ring = (opacity = 1) => `
  <circle cx="512" cy="512" r="366" fill="none"
          stroke="#FFFFFF" stroke-opacity="${0.26 * opacity}" stroke-width="52"/>
  <circle cx="512" cy="512" r="366" fill="none"
          stroke="#FFFFFF" stroke-opacity="${opacity}" stroke-width="52" stroke-linecap="round"
          stroke-dasharray="1656 644" transform="rotate(-90 512 512)"/>`;

/** ¥ 記号。文字ではなくパスで描く（フォントに依存させない） */
const yen = (color = '#FFFFFF') => `
  <g stroke="${color}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 396 356 L 512 508 L 628 356" stroke-width="54"/>
    <path d="M 512 508 L 512 690" stroke-width="54"/>
    <path d="M 410 566 L 614 566" stroke-width="44"/>
    <path d="M 410 634 L 614 634" stroke-width="44"/>
  </g>`;

const svg = (inner, bg = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${GRAD}${bg}${inner}</svg>`;

/** 中央 scale 倍に縮める（アダプティブアイコンの安全領域に収めるため） */
const shrink = (inner, scale) =>
  `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${inner}</g>`;

const FULL = `<rect width="1024" height="1024" fill="url(#bg)"/>`;
/** 角丸の板。スプラッシュなど背景が明るい場所で輪郭を出すため */
const PLATE = `<rect x="72" y="72" width="880" height="880" rx="200" fill="url(#bg)"/>`;

const TARGETS = [
  {
    file: 'assets/icon.png',
    size: 1024,
    alpha: false, // App Store 用。アルファを含めてはいけない
    svg: svg(ring() + yen(), FULL),
  },
  {
    file: 'assets/android-icon-foreground.png',
    size: 432,
    alpha: true,
    // 外周が切られるので中央 62% に収める
    svg: svg(shrink(ring() + yen(), 0.62)),
  },
  {
    file: 'assets/android-icon-background.png',
    size: 432,
    alpha: false,
    svg: svg('', FULL),
  },
  {
    // テーマアイコンと通知アイコン。白一色のシルエットである必要がある
    file: 'assets/android-icon-monochrome.png',
    size: 432,
    alpha: true,
    svg: svg(shrink(yen(), 0.62)),
  },
  {
    file: 'assets/splash-icon.png',
    size: 1024,
    alpha: true,
    svg: svg(ring() + yen(), PLATE),
  },
  {
    file: 'assets/favicon.png',
    size: 196,
    alpha: true,
    svg: svg(ring() + yen(), PLATE),
  },
];

/* ------------------------------------------------------------------ */
/* PNG エンコード（RGB / RGBA）                                        */
/* ------------------------------------------------------------------ */

const crc32 =
  zlib.crc32 ??
  ((() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return (buf) => {
      let c = 0xffffffff;
      for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
  })());

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, w, h, withAlpha) {
  const ch = withAlpha ? 4 : 3;
  // 各行の先頭にフィルタ種別（0 = なし）を置く
  const raw = Buffer.alloc((w * ch + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
      if (withAlpha) raw[o++] = rgba[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = withAlpha ? 6 : 2; // color type: 6=RGBA, 2=RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */

if (!CHROME) {
  console.error('Chrome が見つかりません。');
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>', { waitUntil: 'domcontentloaded' });

  for (const t of TARGETS) {
    const rgba = await page.evaluate(
      async ({ markup, size, opaque }) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
        await img.decode();
        const c = document.getElementById('c');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const d = ctx.getImageData(0, 0, size, size).data;
        // アルファを落とす場合、透明部分が黒くならないよう白で合成しておく
        if (opaque) {
          for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3] / 255;
            d[i] = Math.round(d[i] * a + 255 * (1 - a));
            d[i + 1] = Math.round(d[i + 1] * a + 255 * (1 - a));
            d[i + 2] = Math.round(d[i + 2] * a + 255 * (1 - a));
            d[i + 3] = 255;
          }
        }
        return Array.from(d);
      },
      { markup: t.svg, size: t.size, opaque: !t.alpha },
    );

    const png = encodePng(Uint8Array.from(rgba), t.size, t.size, t.alpha);
    writeFileSync(resolve(t.file), png);
    console.log(
      `  ${t.file.padEnd(42)} ${t.size}x${t.size}  ${t.alpha ? 'RGBA' : 'RGB（アルファなし）'}  ${Math.round(png.length / 1024)}KB`,
    );
  }
} finally {
  await browser.close();
}

console.log('\nアイコンを書き出しました。');
