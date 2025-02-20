const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, 'public/extension');
const targetDir = path.join(__dirname, 'build/extension'); // Changed back to build/extension

async function buildExtension() {
  try {
    // Clean extension build directory
    await fs.remove(targetDir);
    
    // Create extension directory if it doesn't exist
    await fs.ensureDir(targetDir);
    
    // Copy all extension files
    await fs.copy(sourceDir, targetDir);
    
    console.log('Extension files copied successfully to build/extension directory');
  } catch (err) {
    console.error('Error building extension:', err);
    process.exit(1);
  }
}

buildExtension(); 