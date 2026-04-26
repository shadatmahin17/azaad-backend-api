const multer = require('multer');
const path = require('path');
const { AUDIO_DIR, COVER_DIR } = require('../config/env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') return cb(null, AUDIO_DIR);
    if (file.fieldname === 'cover') return cb(null, COVER_DIR);
    return cb(new Error('Invalid upload field'));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 2,
    fileSize: 100 * 1024 * 1024,
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload, avatarUpload };
