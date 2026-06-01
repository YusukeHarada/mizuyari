import sharp from 'sharp';
import { mkdir } from 'fs/promises';

await mkdir('public/icons', { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const padding = Math.floor(size * 0.15);
  const inner = size - padding * 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" fill="#22c55e"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-size="${inner}" font-family="serif">🪴</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icons/icon-${size}.png`);

  console.log(`Generated public/icons/icon-${size}.png`);
}
