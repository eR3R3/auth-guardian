const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'build/extension';
const PUBLIC_DIR = 'public/extension';

async function buildExtension() {
  try {
    // Clean build directory
    await fs.emptyDir(BUILD_DIR);
    
    // Copy extension files from public
    await fs.copy(PUBLIC_DIR, BUILD_DIR, {
      filter: (src) => {
        const filename = path.basename(src);
        // Copy all files except hidden files
        return !filename.startsWith('.');
      }
    });

    // Copy icons
    await fs.copy('public/extension/icons', path.join(BUILD_DIR, 'icons'));

    // Ensure all required files exist
    const requiredFiles = [
      'manifest.json',
      'popup.html',
      'content.js',
      'content.css',
      'background.js',
      'icons/icon16.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(BUILD_DIR, file);
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Missing required file: ${file}`);
      }
    }

    console.log('Extension build completed successfully!');
    console.log('Files in build directory:');
    const files = await fs.readdir(BUILD_DIR);
    console.log(files);

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildExtension(); 