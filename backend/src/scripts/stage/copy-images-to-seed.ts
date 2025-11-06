import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');
const seedImagesDir = path.join(process.cwd(), 'uploads', 'seed-images');

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

async function copyImagesToSeed() {
  console.log('📸 Copying images to seed-images folder...\n');

  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ uploads/ directory does not exist!');
    process.exit(1);
  }

  if (!fs.existsSync(seedImagesDir)) {
    fs.mkdirSync(seedImagesDir, { recursive: true });
    console.log('✅ Created seed-images directory');
  }

  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files
    .filter((file) => {
      const filePath = path.join(uploadsDir, file);
      const isFile = fs.statSync(filePath).isFile();
      const ext = path.extname(file).toLowerCase();
      return isFile && imageExtensions.includes(ext);
    })
    .map((file) => file);

  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in uploads/');
    process.exit(0);
  }

  console.log(`Found ${imageFiles.length} images in uploads/`);

  const existingSeedImages = fs.existsSync(seedImagesDir)
    ? fs.readdirSync(seedImagesDir).filter((file) => {
        const filePath = path.join(seedImagesDir, file);
        return (
          fs.statSync(filePath).isFile() &&
          imageExtensions.includes(path.extname(file).toLowerCase())
        );
      })
    : [];

  console.log(`Already have ${existingSeedImages.length} images in seed-images/`);

  const imagesToCopy = imageFiles.slice(0, Math.min(20, imageFiles.length));
  let copied = 0;

  for (const imageFile of imagesToCopy) {
    const sourcePath = path.join(uploadsDir, imageFile);
    const destPath = path.join(seedImagesDir, imageFile);

    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
      console.log(`   ✅ Copied ${imageFile}`);
    } else {
      console.log(`   ⏭️  Skipped ${imageFile} (already exists)`);
    }
  }

  console.log(`\n✅ Copied ${copied} images to seed-images/`);
  console.log(`📁 Total images in seed-images/: ${existingSeedImages.length + copied}`);
}

copyImagesToSeed()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
