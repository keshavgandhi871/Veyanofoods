const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '../../public/assets');

async function convertToWebp() {
  try {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
      if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        const inputPath = path.join(assetsDir, file);
        const baseName = path.parse(file).name;
        const outputPath = path.join(assetsDir, `${baseName}.webp`);

        if (!fs.existsSync(outputPath)) {
          console.log(`Converting ${file} to WebP...`);
          await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath);
          console.log(`Successfully converted to ${baseName}.webp`);
        } else {
          console.log(`${baseName}.webp already exists.`);
        }
      }
    }
    console.log('Conversion complete.');
  } catch (err) {
    console.error('Error during conversion:', err);
  }
}

convertToWebp();
