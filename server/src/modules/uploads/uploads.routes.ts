import { Router } from "express";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { upload } from "../../utils/upload.js";
import { uploadImageToCloudinary } from "./uploads.service.js";

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
