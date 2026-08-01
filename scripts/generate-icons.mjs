/**
 * Rasterise public/icon.svg into the PNG sizes installers need.
 *
 * iOS renders a blank tile for an SVG apple-touch-icon, and Android wants a
 * maskable variant it can crop to whatever shape the launcher uses. Run this
 * after changing the source mark:
 *
 *   npm run icons
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PUBLIC = "public";
const SOURCE = path.join(PUBLIC, "icon.svg");

/** Launchers crop maskable icons, so the mark is inset into a safe zone. */
const MASKABLE_BACKGROUND = "#0d1013";
const SAFE_ZONE = 0.68;

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`missing ${SOURCE}`);
    process.exit(1);
  }
  const svg = fs.readFileSync(SOURCE);
  const out = (name) => path.join(PUBLIC, name);

  await sharp(svg, { density: 384 }).resize(192, 192).png().toFile(out("icon-192.png"));
  await sharp(svg, { density: 384 }).resize(512, 512).png().toFile(out("icon-512.png"));

  const inner = Math.round(512 * SAFE_ZONE);
  const pad = Math.round((512 - inner) / 2);
  const mark = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: MASKABLE_BACKGROUND },
  })
    .composite([{ input: mark, top: pad, left: pad }])
    .png()
    .toFile(out("icon-maskable-512.png"));

  for (const name of ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
    const { size } = fs.statSync(out(name));
    console.log(`  ${name}  ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
