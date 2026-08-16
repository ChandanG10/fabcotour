import { cloudinary } from "../../config/cloudinary.js";
import { HttpError } from "../../utils/http.js";

export async function uploadImageToCloudinary(file: Express.Multer.File, folder: string) {
  try {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image"
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary upload failed.";

    if (/invalid signature|unauthorized|api secret/i.test(message)) {
      throw new HttpError(
        500,
        "Cloudinary upload failed. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server environment."
      );
    }

    throw new HttpError(500, message);
  }
}

export async function deleteCloudinaryImage(publicId: string) {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new HttpError(400, "Failed to delete image from Cloudinary.");
  }
}
