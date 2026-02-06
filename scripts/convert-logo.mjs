import sharp from 'sharp';
import { readFileSync } from 'fs';

const pngBuffer = readFileSync('public/android-chrome-512x512.png');

await sharp(pngBuffer)
    .resize(200, 200)
    .webp({ quality: 90 })
    .toFile('public/logo.webp');

console.log('✅ Logo converted to WebP from android-chrome-512x512.png');
