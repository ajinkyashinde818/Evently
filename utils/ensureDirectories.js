const fs = require('fs');
const path = require('path');

// Ensure upload directories exist
const ensureDirectories = () => {
  const directories = [
    'uploads',
    'uploads/avatars',
    'uploads/banners'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

module.exports = ensureDirectories;
