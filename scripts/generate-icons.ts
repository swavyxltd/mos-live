#!/usr/bin/env tsx
/**
 * Script to generate all app icons from a source image
 * Usage: tsx scripts/generate-icons.ts <source-image-path>
 * Example: tsx scripts/generate-icons.ts ./new-icon.png
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Icon sizes needed for the app
const iconSizes = [
  { size: 72, path: 'public/icons/icon-72x72.png' },
  { size: 96, path: 'public/icons/icon-96x96.png' },
  { size: 128, path: 'public/icons/icon-128x128.png' },
  { size: 144, path: 'public/icons/icon-144x144.png' },
  { size: 152, path: 'public/icons/icon-152x152.png' },
  { size: 192, path: 'public/icons/icon-192x192.png' },
  { size: 384, path: 'public/icons/icon-384x384.png' },
  { size: 512, path: 'public/icons/icon-512x512.png' },
  // Next.js app directory icons
  { size: 32, path: 'src/app/icon.png' },
  { size: 180, path: 'src/app/apple-icon.png' },
  // Public root icon
  { size: 32, path: 'public/icon.png' },
];

async function generateIcons(sourceImagePath: string) {
  try {
    // Try to use sharp if available
    let sharp: any;
    try {
      sharp = require('sharp');
    } catch (e) {
      console.error('Error: sharp package is required for image processing.');
      console.error('Please install it by running: npm install --save-dev sharp');
      console.error('Or use: npm install --save-dev sharp @types/sharp');
      process.exit(1);
    }

    // Read the source image
    const sourceBuffer = readFileSync(sourceImagePath);
    
    console.log(`Generating icons from: ${sourceImagePath}`);
    console.log(`Generating ${iconSizes.length} icon sizes...\n`);

    // Generate each icon size
    for (const { size, path } of iconSizes) {
      try {
        const outputPath = join(process.cwd(), path);
        const resizedBuffer = await sharp(sourceBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
          })
          .png()
          .toBuffer();
        
        writeFileSync(outputPath, resizedBuffer);
        console.log(`✓ Generated ${path} (${size}x${size})`);
      } catch (error) {
        console.error(`✗ Failed to generate ${path}:`, error);
      }
    }

    console.log('\n✓ All icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the icons look correct');
    console.log('2. Commit the changes: git add public/icons/ src/app/icon.png src/app/apple-icon.png public/icon.png');
    console.log('3. Push to repository');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Get source image path from command line
const sourceImagePath = process.argv[2];

if (!sourceImagePath) {
  console.error('Usage: tsx scripts/generate-icons.ts <source-image-path>');
  console.error('Example: tsx scripts/generate-icons.ts ./new-icon.png');
  process.exit(1);
}

generateIcons(sourceImagePath);
