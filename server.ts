import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { getQuery } from "https://deno.land/x/oak@v12.6.1/helpers.ts";
import { multiParser } from "https://deno.land/x/multiparser/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { extname, join } from "https://deno.land/std@0.208.0/path/mod.ts";

// Types
interface UploadedFile {
  filename: string;
  originalName: string;
  contentType: string;
  data: Uint8Array;
}

interface ImageResponse {
  path: string;
}

interface Subsets {
  [key: string]: string[];
}

// Constants
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const IMG_DIR = "img";
const PORT = 3101;
const SUBSETS_FILE = "subsets.json";

// Ensure image directory exists
await ensureDir(IMG_DIR);

const app = new Application();
const router = new Router();

// Middleware to handle file uploads
const handleUpload = async (ctx: any) => {
  try {
    const body = await multiParser(ctx.request.serverRequest);
    const files = body.files || [];
    const newNames = body.fields["names[]"] || [];
    const uploadedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i] as UploadedFile;
      const ext = extname(file.filename).toLowerCase();

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        continue;
      }

      const fileName = newNames[i] || file.filename;
      const filePath = join(IMG_DIR, fileName);

      try {
        await Deno.writeFile(filePath, file.data);
        uploadedFiles.push(fileName);
      } catch (error) {
        console.error("Error saving file:", error);
      }
    }

    ctx.response.body = { success: true, files: uploadedFiles };
  } catch (error) {
    console.error("Upload error:", error);
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Upload failed" };
  }
};

// Helper functions for subsets
const loadSubsets = async (): Promise<Subsets> => {
  try {
    const data = await Deno.readTextFile(SUBSETS_FILE);
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const saveSubsets = async (subsets: Subsets): Promise<void> => {
  await Deno.writeTextFile(SUBSETS_FILE, JSON.stringify(subsets, null, 2));
};

// List images endpoint
const listImages = async (ctx: any) => {
  try {
    const query = getQuery(ctx);
    const subsetName = query.subset;
    const allImages: ImageResponse[] = [];

    // Check web root
    for await (const entry of Deno.readDir(".")) {
      if (entry.isFile) {
        const ext = extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          allImages.push({ path: entry.name });
        }
      }
    }

    // Check img directory
    if (await exists(IMG_DIR)) {
      for await (const entry of Deno.readDir(IMG_DIR)) {
        if (entry.isFile) {
          const ext = extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            allImages.push({ path: `${IMG_DIR}/${entry.name}` });
          }
        }
      }
    }

    // Filter by subset if specified
    if (subsetName) {
      const subsets = await loadSubsets();
      if (subsets[subsetName]) {
        const filteredImages = allImages.filter(img => 
          subsets[subsetName].includes(img.path)
        );
        ctx.response.body = filteredImages;
        return;
      }
    }

    ctx.response.body = allImages;
  } catch (error) {
    console.error("Error reading directories:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to list images" };
  }
};

// Get all subsets
const getSubsets = async (ctx: any) => {
  try {
    const subsets = await loadSubsets();
    ctx.response.body = subsets;
  } catch (error) {
    console.error("Error loading subsets:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to load subsets" };
  }
};

// Create or update a subset
const saveSubset = async (ctx: any) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { name, images } = body;
    
    if (!name || !Array.isArray(images)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Name and images array are required" };
      return;
    }

    const subsets = await loadSubsets();
    subsets[name] = images;
    await saveSubsets(subsets);

    ctx.response.body = { success: true, message: "Subset saved successfully" };
  } catch (error) {
    console.error("Error saving subset:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to save subset" };
  }
};

// Delete a subset
const deleteSubset = async (ctx: any) => {
  try {
    const { name } = ctx.params;
    const subsets = await loadSubsets();
    
    if (subsets[name]) {
      delete subsets[name];
      await saveSubsets(subsets);
      ctx.response.body = { success: true, message: "Subset deleted successfully" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { error: "Subset not found" };
    }
  } catch (error) {
    console.error("Error deleting subset:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete subset" };
  }
};

// Routes
router
  .post("/upload", handleUpload)
  .get("/list-images", listImages)
  .get("/subsets", getSubsets)
  .post("/subsets", saveSubset)
  .delete("/subsets/:name", deleteSubset);

// Serve static files
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: Deno.cwd(),
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log(`Server running at http://localhost:${PORT}`);
await app.listen({ port: PORT });
