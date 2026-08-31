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

const modelExtensions = new Set([".glb", ".gltf", ".obj"]);
const modelMimeTypes = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "text/plain",
  "application/json",
  "application/octet-stream"
]);

export const modelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    if (!modelExtensions.has(extension) || !modelMimeTypes.has(file.mimetype.toLowerCase())) {
      callback(new HttpError(400, "Only GLB, GLTF and OBJ model files are allowed."));
      return;
    }
    callback(null, true);
  }
});
