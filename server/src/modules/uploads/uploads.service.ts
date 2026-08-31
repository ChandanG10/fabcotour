import { cloudinary } from "../../config/cloudinary.js";
import { HttpError } from "../../utils/http.js";

function detectImageMimeType(buffer: Buffer) {
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= pngSignature.length && buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return "image/png";
  }

  throw new HttpError(400, "The selected file is not a valid JPG, PNG or WebP image.");
}

export async function uploadImageToCloudinary(file: Express.Multer.File, folder: string) {
  const mimeType = detectImageMimeType(file.buffer);

  try {
    const dataUri = `data:${mimeType};base64,${file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image"
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
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

export async function uploadModelToCloudinary(file: Express.Multer.File, folder: string) {
  try {
    const dataUri = `data:${file.mimetype || "application/octet-stream"};base64,${file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "raw",
      use_filename: true,
      unique_filename: true
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    throw new HttpError(500, error instanceof Error ? error.message : "3D model upload failed.");
  }
}

export async function deleteCloudinaryImage(publicId: string) {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new HttpError(400, "Failed to delete image from Cloudinary.");
  }
}
