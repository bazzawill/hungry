import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import multer from "multer";
import { fileURLToPath } from "node:url";

// Get current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Supported image extensions
const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Subsets file path
const SUBSETS_FILE = "subsets.json";

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Create img directory if it doesn't exist
      await fs.mkdir("img", { recursive: true });
      cb(null, "img/");
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    // Temporarily use original filename - we'll rename it later if needed
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (supportedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Serve static files from the current directory
app.use(express.static("."));

// Parse JSON bodies
app.use(express.json());

// Handle file uploads
app.post("/upload", upload.array("images"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded.",
    });
  }

  const newNames = req.body["names[]"] || [];
  const uploadedFiles = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    if (newNames[i]) {
      const oldPath = path.join("img", file.filename);
      const newPath = path.join("img", newNames[i]);

      try {
        await fs.rename(oldPath, newPath);
        uploadedFiles.push(newNames[i]);
      } catch (error) {
        console.error("Error renaming file:", error);
        uploadedFiles.push(file.filename);
      }
    } else {
      uploadedFiles.push(file.filename);
    }
  }

  res.json({ success: true, files: uploadedFiles });
});

// Helper function to load subsets
async function loadSubsets() {
  try {
    const data = await fs.readFile(SUBSETS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return empty object if file doesn't exist
  }
}

// Helper function to save subsets
async function saveSubsets(subsets) {
  await fs.writeFile(SUBSETS_FILE, JSON.stringify(subsets, null, 2));
}

// List images endpoint
app.get("/list-images", async (req, res) => {
  try {
    const subsetName = req.query.subset;
    const allImages = [];

    // Check web root
    const rootFiles = await fs.readdir(".");
    for (const file of rootFiles) {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        allImages.push({ path: file });
      }
    }

    // Check img directory if it exists
    try {
      const imgFiles = await fs.readdir("img");
      for (const file of imgFiles) {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          allImages.push({ path: `img/${file}` });
        }
      }
    } catch (_err) {
      // img directory doesn't exist, just continue
    }

    // Filter by subset if specified
    if (subsetName) {
      const subsets = await loadSubsets();
      if (subsets[subsetName]) {
        const filteredImages = allImages.filter((img) =>
          subsets[subsetName].includes(img.path)
        );
        return res.json(filteredImages);
      }
    }

    res.json(allImages);
  } catch (error) {
    console.error("Error reading directories:", error);
    res.status(500).json({ error: "Failed to list images" });
  }
});

// Get all subsets
app.get("/subsets", async (req, res) => {
  try {
    const subsets = await loadSubsets();
    res.json(subsets);
  } catch (error) {
    console.error("Error loading subsets:", error);
    res.status(500).json({ error: "Failed to load subsets" });
  }
});

// Create or update a subset
app.post("/subsets", async (req, res) => {
  try {
    const { name, images } = req.body;
    if (!name || !Array.isArray(images)) {
      return res.status(400).json({
        error: "Name and images array are required",
      });
    }

    const subsets = await loadSubsets();
    subsets[name] = images;
    await saveSubsets(subsets);

    res.json({ success: true, message: "Subset saved successfully" });
  } catch (error) {
    console.error("Error saving subset:", error);
    res.status(500).json({ error: "Failed to save subset" });
  }
});

// Delete a subset
app.delete("/subsets/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const subsets = await loadSubsets();

    if (subsets[name]) {
      delete subsets[name];
      await saveSubsets(subsets);
      res.json({ success: true, message: "Subset deleted successfully" });
    } else {
      res.status(404).json({ error: "Subset not found" });
    }
  } catch (error) {
    console.error("Error deleting subset:", error);
    res.status(500).json({ error: "Failed to delete subset" });
  }
});

const PORT = 3101;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
