import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const BRAND_DIRECTORY = path.join(PROJECT_ROOT, "assets/brand");
const README_DIRECTORY = path.join(PROJECT_ROOT, "assets/readme");
const EXTENSION_ICON_DIRECTORY = path.join(PROJECT_ROOT, "public/icons");
const ANDROID_FOREGROUND_PATH = path.join(
  PROJECT_ROOT,
  "apps/android/app/src/main/res/drawable-nodpi/ic_app_foreground.png",
);

const MASTER_SIZE = 1024;
const ANDROID_FOREGROUND_SIZE = 700;
const ANDROID_FOREGROUND_PADDING = (MASTER_SIZE - ANDROID_FOREGROUND_SIZE) / 2;
const EXTENSION_ICON_SIZES = [16, 32, 48, 128];
const PNG_OPTIONS = {
  adaptiveFiltering: false,
  compressionLevel: 9,
  palette: false,
  progressive: false,
};

const MARK_SOURCE_PATH = path.join(BRAND_DIRECTORY, "tumevaade-mark.svg");
const DARK_MASTER_PATH = path.join(BRAND_DIRECTORY, "tumevaade-dark.png");
const LIGHT_MASTER_PATH = path.join(BRAND_DIRECTORY, "tumevaade-light.png");
const MARK_MASTER_PATH = path.join(BRAND_DIRECTORY, "tumevaade-mark.png");
const README_BANNER_PATH = path.join(README_DIRECTORY, "banner.webp");

function logoMasterSvg({ light = false } = {}) {
  const surface = light ? "#ffffff" : "#171c19";
  const border = light ? "#c1c0b8" : "#2a332e";
  const secondary = light ? "#202824" : "#f2f0e9";

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="mint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7ce8c3"/>
          <stop offset="1" stop-color="#52c7a1"/>
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="992" height="992" rx="238" fill="${surface}" stroke="${border}" stroke-width="10"/>
      <path d="M690 245H425C325.6 245 245 325.6 245 425V690" fill="none" stroke="url(#mint)" stroke-width="160" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M334 779H599C698.4 779 779 698.4 779 599V334" fill="none" stroke="${secondary}" stroke-width="160" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `);
}

function readmeBannerSvg(markDataUrl) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="3240" height="1080" viewBox="0 0 3240 1080">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0f1311"/>
          <stop offset="0.58" stop-color="#171c19"/>
          <stop offset="1" stop-color="#23483b"/>
        </linearGradient>
        <radialGradient id="glow" cx="78%" cy="18%" r="52%">
          <stop offset="0" stop-color="#65d6b1" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#65d6b1" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="3240" height="1080" fill="url(#background)"/>
      <rect width="3240" height="1080" fill="url(#glow)"/>
      <image href="${markDataUrl}" x="700" y="250" width="580" height="580"/>
      <text x="1858" y="515" text-anchor="middle" fill="#f2f0e9" font-family="Arial, Helvetica, sans-serif" font-size="180" font-weight="700" letter-spacing="-5">Tumevaade</text>
      <text x="1858" y="625" text-anchor="middle" fill="#f2f0e9" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="400">Tuttav keskkond, uus vaade.</text>
    </svg>
  `);
}

async function buildOutputs() {
  if (!fs.existsSync(MARK_SOURCE_PATH)) {
    throw new Error(`${path.relative(PROJECT_ROOT, MARK_SOURCE_PATH)} is missing`);
  }

  const [darkMaster, lightMaster, markMaster] = await Promise.all([
    sharp(logoMasterSvg()).png(PNG_OPTIONS).toBuffer(),
    sharp(logoMasterSvg({ light: true }))
      .png(PNG_OPTIONS)
      .toBuffer(),
    sharp(MARK_SOURCE_PATH).png(PNG_OPTIONS).toBuffer(),
  ]);

  const extensionIcons = await Promise.all(
    EXTENSION_ICON_SIZES.map(async (size) => ({
      data: await sharp(darkMaster)
        .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .png(PNG_OPTIONS)
        .toBuffer(),
      filePath: path.join(EXTENSION_ICON_DIRECTORY, `icon-${size}.png`),
    })),
  );

  const androidForeground = await sharp(markMaster)
    .resize(ANDROID_FOREGROUND_SIZE, ANDROID_FOREGROUND_SIZE, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: ANDROID_FOREGROUND_PADDING,
      bottom: ANDROID_FOREGROUND_PADDING,
      left: ANDROID_FOREGROUND_PADDING,
      right: ANDROID_FOREGROUND_PADDING,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG_OPTIONS)
    .toBuffer();

  const markDataUrl = `data:image/png;base64,${markMaster.toString("base64")}`;
  const readmeBanner = await sharp(readmeBannerSvg(markDataUrl))
    .webp({ effort: 6, quality: 92, smartSubsample: true })
    .toBuffer();

  return [
    { data: darkMaster, filePath: DARK_MASTER_PATH },
    { data: lightMaster, filePath: LIGHT_MASTER_PATH },
    { data: markMaster, filePath: MARK_MASTER_PATH },
    ...extensionIcons,
    { data: androidForeground, filePath: ANDROID_FOREGROUND_PATH },
    { data: readmeBanner, filePath: README_BANNER_PATH },
  ];
}

function assertCurrent(filePath, expected) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${path.relative(PROJECT_ROOT, filePath)} is missing`);
  }

  const actual = fs.readFileSync(filePath);
  if (!actual.equals(expected)) {
    throw new Error(`${path.relative(PROJECT_ROOT, filePath)} is stale; run npm run build:brand`);
  }
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const outputs = await buildOutputs();

  if (checkOnly) {
    for (const { data, filePath } of outputs) assertCurrent(filePath, data);
    console.log(`Brand check passed: ${outputs.length} brand and platform images are current.`);
    return;
  }

  fs.mkdirSync(EXTENSION_ICON_DIRECTORY, { recursive: true });
  fs.mkdirSync(path.dirname(ANDROID_FOREGROUND_PATH), { recursive: true });
  fs.mkdirSync(README_DIRECTORY, { recursive: true });
  for (const { data, filePath } of outputs) fs.writeFileSync(filePath, data);

  console.log(
    `Built Tumevaate brand masters, ${EXTENSION_ICON_SIZES.length} extension icons, the Android adaptive-icon foreground, and the README banner.`,
  );
}

await main();
