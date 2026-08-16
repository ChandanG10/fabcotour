import multer from "multer";
import { extname } from "node:path";
import { HttpError } from "./http.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/x-webp"
]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxFileSize = 5 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const genericMimeType = !file.mimetype || file.mimetype === "application/octet-stream";

    if (
      !allowedExtensions.has(extension) ||
      (!genericMimeType && !allowedMimeTypes.has(file.mimetype.toLowerCase()))
    ) {
      callback(new HttpError(400, "Only JPG, PNG and WebP files are allowed."));
      return;
    }

    callback(null, true);
  }
});
