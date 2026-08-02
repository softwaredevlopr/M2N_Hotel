const express = require("express");
const path = require("path");
const multer = require("multer");
const adminMediaController = require("../controllers/adminMedia.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { updateMediaSchema } = require("../validators/adminMedia.validator");
const {
  MEDIA_CATEGORIES,
  uploadsRoot,
  ensureDir,
} = require("../utils/mediaCategory");

const router = express.Router();

router.use(requireAdminAuth);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const hotelId = String(req.body?.hotel_id || "").trim();
    const category = String(req.body?.category || "Gallery").trim();
    if (!UUID_REGEX.test(hotelId) || !MEDIA_CATEGORIES.includes(category)) {
      // Temp dump; controller validation will reject and clean up.
      const fallback = path.join(uploadsRoot(), "_tmp");
      ensureDir(fallback);
      return cb(null, fallback);
    }
    const dir = path.join(uploadsRoot(), "hotels", hotelId, category);
    ensureDir(dir);
    return cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
      ? ext
      : ".jpg";
    const base = String(file.originalname || "image")
      .replace(ext, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
    cb(null, `${Date.now()}-${base}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    return cb(null, true);
  },
});

function handleMulter(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: ["File too large (max 5MB)"],
        });
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [err.message],
      });
    }
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [err.message || "Upload failed"],
    });
  });
}

router.get("/", adminMediaController.listMedia);
router.post("/upload", handleMulter, adminMediaController.uploadMedia);
router.get("/:id", adminMediaController.getMediaById);
router.patch(
  "/:id",
  validate(updateMediaSchema),
  adminMediaController.updateMedia
);
router.delete("/:id", adminMediaController.deleteMedia);

module.exports = router;
