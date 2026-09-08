/**
 * Rasterises build assets that browsers and social platforms cannot take as SVG:
 *   public/favicon.ico          32x32 + 16x16 (legacy tabs, bookmarks)
 *   public/apple-touch-icon.png 180x180 (iOS home screen)
 *   public/images/vikas-peraka.jpg  portrait referenced by JSON-LD
 *   public/og-image.png         1200x630 social preview card
 *
 * Run via `npm run assets` or automatically as part of `npm run build`.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => resolve(root, ...s);

const faviconSvg = await readFile(p('public/favicon.svg'));
const portraitPath = p('src/assets/vikas-peraka.png');

await mkdir(p('public/images'), { recursive: true });

/* ---- favicons ----
   Google asks for a favicon that is a multiple of 48px square for search
   results, so the .ico carries a 48px entry as well as the 16/32 browsers use,
   and a 96px PNG is published for anything that prefers a larger source. */
const icoPng = async (size) =>
  sharp(faviconSvg, { density: 768 }).resize(size, size).png().toBuffer();

const png16 = await icoPng(16);
const png32 = await icoPng(32);
const png48 = await icoPng(48);

await writeFile(p('public/favicon-96.png'), await icoPng(96));
await writeFile(p('public/favicon-192.png'), await icoPng(192));
await writeFile(p('public/apple-touch-icon.png'),
  await sharp(faviconSvg, { density: 768 }).resize(180, 180).png({ quality: 90 }).toBuffer());

/* ICO container: header + two PNG-encoded entries. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dirs = [];
  for (const { size, data } of images) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size === 256 ? 0 : size, 0); // width
    d.writeUInt8(size === 256 ? 0 : size, 1); // height
    d.writeUInt8(0, 2);                       // palette
    d.writeUInt8(0, 3);                       // reserved
    d.writeUInt16LE(1, 4);                    // colour planes
    d.writeUInt16LE(32, 6);                   // bits per pixel
    d.writeUInt32LE(data.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += data.length;
    dirs.push(d);
  }
  return Buffer.concat([header, ...dirs, ...images.map((i) => i.data)]);
}
await writeFile(p('public/favicon.ico'),
  buildIco([
    { size: 16, data: png16 },
    { size: 32, data: png32 },
    { size: 48, data: png48 },
  ]));

/* ---- portrait for structured data ---- */
await sharp(portraitPath).resize(600, 600, { fit: 'cover', position: 'top' })
  .jpeg({ quality: 82, mozjpeg: true }).toFile(p('public/images/vikas-peraka.jpg'));

/* ---- social preview card (1200x630) ---- */
const face = await sharp(portraitPath)
  .resize(300, 300, { fit: 'cover', position: 'top' })
  .composite([{
    input: Buffer.from(
      '<svg width="300" height="300"><circle cx="150" cy="150" r="150" fill="#fff"/></svg>'),
    blend: 'dest-in',
  }])
  .png().toBuffer();

const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10141C"/><stop offset="1" stop-color="#080A0E"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0v40" fill="none" stroke="#212836" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)" opacity=".55"/>
  <circle cx="1010" cy="150" r="230" fill="#6E8BFF" opacity=".08"/>
  <circle cx="190" cy="560" r="200" fill="#FFB86B" opacity=".06"/>
  <text x="80" y="238" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="30"
        font-weight="700" fill="#7D8899" letter-spacing="5">VIKAS PERAKA</text>
  <text x="80" y="330" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="66"
        font-weight="800" fill="#F4F7FB" letter-spacing="-2.5">Software used by a billion</text>
  <text x="80" y="404" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="66"
        font-weight="800" fill="#F4F7FB" letter-spacing="-2.5">people. Growth work that</text>
  <text x="80" y="478" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="66"
        font-weight="800" fill="#FFB86B" letter-spacing="-2.5">moves revenue.</text>
  <text x="80" y="552" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="27"
        font-weight="600" fill="#7D8899">Full-stack Software Engineer at Meta &#183; San Francisco</text>
  <circle cx="1010" cy="150" r="106" fill="none" stroke="#6E8BFF" stroke-width="2" opacity=".45"/>
</svg>`);

await sharp(card)
  .composite([{ input: face, left: 860, top: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(p('public/og-image.png'));

console.log('✓ favicon.ico (16/32/48), favicon-96.png, favicon-192.png, apple-touch-icon.png, vikas-peraka.jpg, og-image.png');
