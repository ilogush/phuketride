import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  getVariantPath,
  getResizeWidth,
  getClosestVariant,
  calculateDimensions,
  IMAGE_VARIANTS,
} from "../app/lib/image-variants.server";

describe("image-variants.server", () => {
  it("should generate variant path", () => {
    const path = getVariantPath("cars/123/photo.webp", IMAGE_VARIANTS.medium);
    assert.equal(path, "cars/123/photo-md.webp");
  });

  it("should handle path without extension", () => {
    const path = getVariantPath("cars/123/photo", IMAGE_VARIANTS.small);
    assert.equal(path, "cars/123/photo-sm");
  });

  it("should extract resize width from URL", () => {
    const width = getResizeWidth("https://example.com/photo.webp?w=800");
    assert.equal(width, 800);
  });

  it("should return null for URL without width param", () => {
    const width = getResizeWidth("https://example.com/photo.webp");
    assert.equal(width, null);
  });

  it("should limit resize width to 1920", () => {
    const width = getResizeWidth("https://example.com/photo.webp?w=5000");
    assert.equal(width, 1920);
  });

  it("should get closest variant for requested width", () => {
    const variant = getClosestVariant(600);
    assert.equal(variant.width, 800);
    assert.equal(variant.suffix, "-md");
  });

  it("should return largest variant if requested exceeds all", () => {
    const variant = getClosestVariant(3000);
    assert.equal(variant.width, 1920);
  });

  it("should calculate dimensions maintaining aspect ratio", () => {
    const dims = calculateDimensions(1600, 1200, 800);
    assert.equal(dims.width, 800);
    assert.equal(dims.height, 600);
  });

  it("should not upscale if original is smaller", () => {
    const dims = calculateDimensions(400, 300, 800);
    assert.equal(dims.width, 400);
    assert.equal(dims.height, 300);
  });
});
