import { Router } from "express";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { HttpError } from "../../utils/http.js";
import { modelUpload, upload } from "../../utils/upload.js";
import { uploadImageToCloudinary, uploadModelToCloudinary } from "./uploads.service.js";

export const uploadsRouter = Router();

uploadsRouter.post(
  "/images",
  requireAdminAuth,
  upload.array("images", 10),
  asyncHandler(async (request, response) => {
    const files = request.files as Express.Multer.File[];
    const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file, "fab-couture")));
    response.status(201).json({ items: uploads });
  })
);

uploadsRouter.post(
  "/models",
  requireAdminAuth,
  modelUpload.single("model"),
  asyncHandler(async (request, response) => {
    if (!request.file) throw new HttpError(400, "Choose a GLB, GLTF or OBJ model to upload.");
    const uploaded = await uploadModelToCloudinary(request.file, "fab-couture/customisation-models");
    response.status(201).json({ item: { ...uploaded, originalName: request.file.originalname } });
  })
);
