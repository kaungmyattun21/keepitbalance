import { RECIPE_IMAGE_MAX_BYTES, type RecipeImage } from "@keepitbalance/shared/meal-planning";
import { badRequest } from "../../../../shared/errors.ts";

export function validateRecipeImage(image: RecipeImage) {
  const data = Buffer.from(image.data, "base64");
  if (data.length > RECIPE_IMAGE_MAX_BYTES)
    throw badRequest("VALIDATION_ERROR", "Recipe images must be 2 MB or smaller.");
  const isPng =
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
    data.toString("ascii", 12, 16) === "IHDR";
  const isJpeg = data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isWebp =
    data.length >= 16 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  if (!(
    (image.contentType === "image/png" && isPng) ||
    (image.contentType === "image/jpeg" && isJpeg) ||
    (image.contentType === "image/webp" && isWebp)
  ))
    throw badRequest("VALIDATION_ERROR", "Choose a JPEG, PNG, or WebP image with a matching file type.");
}
