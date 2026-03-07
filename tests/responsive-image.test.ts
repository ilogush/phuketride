import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  generateSrcSet,
  addSizeToUrl,
  generateSizesAttribute,
  getOptimalSize,
  DEFAULT_SIZES,
} from "../app/lib/responsive-image";

describe("responsive-image", () => {
  it("should generate srcset with default sizes", () => {
    const srcset = generateSrcSet("/assets/photo.webp");
    
    assert.ok(srcset.includes("/assets/photo.webp?w=200 200w"));
    assert.ok(srcset.includes("/assets/photo.webp?w=400 400w"));
    assert.ok(srcset.includes("/assets/photo.webp?w=800 800w"));
    assert.ok(srcset.includes("/assets/photo.webp?w=1200 1200w"));
    assert.ok(srcset.includes("/assets/photo.webp?w=1920 1920w"));
  });

  it("should generate srcset with custom sizes", () => {
    const srcset = generateSrcSet("/assets/photo.webp", {
      small: 400,
      medium: 800,
    });
    
    assert.ok(srcset.includes("/assets/photo.webp?w=400 400w"));
    assert.ok(srcset.includes("/assets/photo.webp?w=800 800w"));
    assert.ok(!srcset.includes("1200w"));
  });

  it("should add size parameter to URL", () => {
    const url = addSizeToUrl("/assets/photo.webp", 800);
    assert.equal(url, "/assets/photo.webp?w=800");
  });

  it("should add size parameter to URL with existing query", () => {
    const url = addSizeToUrl("/assets/photo.webp?v=1", 800);
    assert.equal(url, "/assets/photo.webp?v=1&w=800");
  });

  it("should generate sizes attribute", () => {
    const sizes = generateSizesAttribute([
      { media: "(min-width: 1024px)", size: "400px" },
      { media: "(min-width: 768px)", size: "350px" },
      { media: "", size: "100vw" },
    ]);
    
    assert.equal(
      sizes,
      "(min-width: 1024px) 400px, (min-width: 768px) 350px,  100vw"
    );
  });

  it("should get optimal size for viewport", () => {
    assert.equal(getOptimalSize(300, "card"), 400);
    assert.equal(getOptimalSize(500, "card"), 800);
    assert.equal(getOptimalSize(1000, "card"), 800);
  });

  it("should return largest size if viewport exceeds all", () => {
    const size = getOptimalSize(2000, "thumbnail");
    assert.equal(size, 400);
  });
});
