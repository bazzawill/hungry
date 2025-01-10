const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const app = express();

// Supported image extensions
const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async function(req, file, cb) {
    try {
      // Create img directory if it doesn't exist
      await fs.mkdir('img', { recursive: true });
      cb(null, 'img/');
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function(req, file, cb) {
    // Temporarily use original filename - we'll rename it later if needed
    cb(null, file.originalname);
  }

});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (supportedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }

});

// Serve static files from the current directory
app.use(express.static('.'));


// Handle file uploads
app.post('/upload', upload.array('images'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const newNames = req.body['names[]'] || [];
  const uploadedFiles = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    if (newNames[i]) {
      const oldPath = path.join('img', file.filename);
      const newPath = path.join('img', newNames[i]);

      try {
        await fs.rename(oldPath, newPath);
        uploadedFiles.push(newNames[i]);
      } catch (error) {
        console.error('Error renaming file:', error);
        uploadedFiles.push(file.filename);
      }
    } else {
      uploadedFiles.push(file.filename);
    }
  }

  res.json({ success: true, files: uploadedFiles });
});

// List images endpoint
app.get('/list-images', async (req, res) => {
  try {
    let images = [];

    // Check web root
    const rootFiles = await fs.readdir('.');
    for (const file of rootFiles) {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        images.push({ path: file });
      }
    }


    // Check img directory if it exists
    try {
      const imgFiles = await fs.readdir('img');
      for (const file of imgFiles) {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          images.push({ path: `img/${file}` });
        }
      }
    } catch (err) {
      // img directory doesn't exist, just continue
    }


    res.json(images);
  } catch (error) {
    console.error('Error reading directories:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

const PORT = 3101;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
