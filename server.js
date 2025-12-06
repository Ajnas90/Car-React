// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Folder: public/legacy/images/gallery
const galleryDir = path.join(__dirname, "public", "legacy", "images", "gallery");
fs.mkdirSync(galleryDir, { recursive: true });

// Serve static files so React can load them
app.use("/legacy", express.static(path.join(__dirname, "public", "legacy")));

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, galleryDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-z0-9-_]/gi, "_");
    const timestamp = Date.now();
    cb(null, `${safeBase}_${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * POST /api/gallery-upload
 * field name: "image"
 */
app.post("/api/gallery-upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filename = req.file.filename;
  const url = `/legacy/images/gallery/${filename}`;

  console.log("Uploaded:", filename);

  return res.json({
    success: true,
    filename,
    url,
  });
});

/**
 * POST /api/gallery-delete
 * body: { filename: "xxx_timestamp.jpg" }
 */
app.post("/api/gallery-delete", (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "filename is required" });
  }

  const filePath = path.join(galleryDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Delete failed" });
    }

    console.log("Deleted:", filename);
    return res.json({ success: true });
  });
});
/**
 * GET /api/gallery
 * Returns FULL HTML for gallery grid
 */
app.get("/api/gallery", (req, res) => {
  fs.readdir(galleryDir, (err, files) => {
    if (err) {
      console.error("Read error:", err);
      return res.status(500).send("Error reading gallery folder");
    }

    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const videoExts = [".mp4", ".webm", ".ogg"];
    const allowed = [...imageExts, ...videoExts];

    let html = "";

    files
      .filter((f) => allowed.includes(path.extname(f).toLowerCase()))
      .forEach((file) => {
        const ext = path.extname(file).toLowerCase();
        const isVideo = videoExts.includes(ext);

        const url = `Public/legacy/images/gallery/${file}`;

        // Extract category from filename: category_imageName_timestamp.ext
        const withoutExt = file.replace(/\.[^.]+$/, "");
        const parts = withoutExt.split("_");

        const category = parts.length > 1 ? parts[0] : "misc";
        const imageName =
          parts.length > 1 ? parts.slice(1).join("_") : withoutExt;

        if (isVideo) {
          // VIDEO ITEM (thumbnail – no controls here, just click to open popup)
          html += `
  <div class="gallery-item ${category}">
    <div class="work-gallery">
      <div class="gallery-thumb">
        <video
          class="img-fullwidth"
          src="${url}"
          data-src="${url}"
          data-type="video"
          muted
          playsinline
          style="cursor: pointer;"
        ></video>
      </div>
    </div>
  </div>
`;
        } else {
          // IMAGE ITEM
          html += `
  <div class="gallery-item ${category}">
    <div class="work-gallery">
      <div class="gallery-thumb">
        <img
          class="img-fullwidth"
          src="${url}"
          data-src="${url}"
          data-type="image"
          alt="${imageName}"
          style="cursor: pointer;"
        />
      </div>
    </div>
  </div>
`;
        }
      });

    res.send(html);
  });
});



// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

});
