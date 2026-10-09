/**
 * F-TECH-Student-Hub Storage Service
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'private-uploads');

class StorageService {
  static getFilePath(filename) {
    return path.join(uploadDir, filename);
  }

  static fileExists(filename) {
    if (!filename) return false;
    const fullPath = path.join(uploadDir, filename);
    return fs.existsSync(fullPath);
  }

  static deleteFile(filename) {
    if (!filename) return false;
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        return true;
      } catch (err) {
        console.error('Error deleting file:', err);
        return false;
      }
    }
    return false;
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = StorageService;
