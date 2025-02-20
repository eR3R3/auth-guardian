const fs = require('fs');
const path = require('path');

// Simple SVG template for a basic icon
const generateSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#4F46E5"/>
  <circle cx="50%" cy="50%" r="40%" fill="#818CF8"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size/2}px" fill="white" text-anchor="middle" dy="${size/6}">TG</text>
</svg>
`;

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'public/extension/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons for each size
sizes.forEach(size => {
  const svg = generateSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), svg);
});

console.log('Icons generated successfully!'); 