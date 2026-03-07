import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  validateField,
  validateForm,
  isFormValid,
  getFormErrors,
  VALIDATION_RULES,
} from "../app/lib/form-validation";

describe("form-validation", () => {
  describe("validateField", () => {
    it("should validate required field", () => {
      const result = validateField("", { required: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes("This field is required"));
    });

    it("should pass required field with value", () => {
      const result = validateField("test", { required: true });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it("should validate min length", () => {
      const result = validateField("ab", { minLength: 3 });
      assert.equal(result.valid, false);
      assert.ok(result.errors[0].includes("Minimum 3 characters"));
    });

    it("should validate max length", () => {
      const result = validateField("abcdef", { maxLength: 5 });
      assert.equal(result.valid, false);
      assert.ok(result.errors[0].includes("Maximum 5 characters"));
    });

    it("should validate pattern", () => {
      const result = validateField("abc123", {
        pattern: /^[a-z]+$/,
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes("Invalid format"));
    });

    it("should validate custom rules", () => {
      const result = validateField("test", {
        custom: [
          {
            validate: (value) => value.length > 5,
            message: "Must be longer than 5",
          },
        ],
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes("Must be longer than 5"));
    });

    it("should skip validation for empty non-required field", () => {
      const result = validateField("", { minLength: 3 });
      assert.equal(result.valid, true);
    });
  });

  describe("VALIDATION_RULES", () => {
    it("should validate email", () => {
      assert.ok(VALIDATION_RULES.email.pattern.test("test@example.com"));
      assert.ok(!VALIDATION_RULES.email.pattern.test("invalid-email"));
    });

    it("should validate phone", () => {
      assert.ok(VALIDATION_RULES.phone.pattern.test("+1234567890"));
      assert.ok(VALIDATION_RULES.phone.pattern.test("123-456-7890"));
      assert.ok(!VALIDATION_RULES.phone.pattern.test("abc"));
    });

    it("should validate latin only", () => {
      assert.ok(VALIDATION_RULES.latinOnly.pattern.test("John Doe"));
      assert.ok(!VALIDATION_RULES.latinOnly.pattern.test("Иван123"));
    });

    it("should validate numeric", () => {
      assert.ok(VALIDATION_RULES.numeric.pattern.test("12345"));
      assert.ok(!VALIDATION_RULES.numeric.pattern.test("123.45"));
    });

    it("should validate decimal", () => {
      assert.ok(VALIDATION_RULES.decimal.pattern.test("123.45"));
      assert.ok(VALIDATION_RULES.decimal.pattern.test("123"));
      assert.ok(!VALIDATION_RULES.decimal.pattern.test("abc"));
    });

    it("should validate URL", () => {
      assert.ok(VALIDATION_RULES.url.pattern.test("https://example.com"));
      assert.ok(VALIDATION_RULES.url.pattern.test("http://test.com"));
      assert.ok(!VALIDATION_RULES.url.pattern.test("example.com"));
    });

    it("should validate passport", () => {
      assert.ok(VALIDATION_RULES.passport.pattern.test("AB123456"));
      assert.ok(!VALIDATION_RULES.passport.pattern.test("ab-123"));
    });

    it("should validate license plate", () => {
      assert.ok(VALIDATION_RULES.licensePlate.pattern.test("ABC-123"));
      assert.ok(VALIDATION_RULES.licensePlate.pattern.test("AB 1234"));
      assert.ok(!VALIDATION_RULES.licensePlate.pattern.test("АБВ-123"));
    });
  });

  describe("validateForm", () => {
    it("should validate entire form", () => {
      const formData = {
        email: "test@example.com",
        name: "John",
        age: "25",
      };

      const rules = {
        email: { required: true, pattern: VALIDATION_RULES.email.pattern },
        name: { required: true, minLength: 2 },
        age: { required: true, pattern: VALIDATION_RULES.numeric.pattern },
      };

      const results = validateForm(formData, rules);

      assert.equal(results.email.valid, true);
      assert.equal(results.name.valid, true);
      assert.equal(results.age.valid, true);
    });

    it("should return errors for invalid fields", () => {
      const formData = {
        email: "invalid",
        name: "J",
        age: "abc",
      };

      const rules = {
        email: { required: true, pattern: VALIDATION_RULES.email.pattern },
        name: { required: true, minLength: 2 },
        age: { required: true, pattern: VALIDATION_RULES.numeric.pattern },
      };

      const results = validateForm(formData, rules);

      assert.equal(results.email.valid, false);
      assert.equal(results.name.valid, false);
      assert.equal(results.age.valid, false);
    });
  });

  describe("isFormValid", () => {
    it("should return true for valid form", () => {
      const results = {
        email: { valid: true, errors: [] },
        name: { valid: true, errors: [] },
      };

      assert.equal(isFormValid(results), true);
    });

    it("should return false for invalid form", () => {
      const results = {
        email: { valid: true, errors: [] },
        name: { valid: false, errors: ["Required"] },
      };

      assert.equal(isFormValid(results), false);
    });
  });

  describe("getFormErrors", () => {
    it("should return only invalid fields", () => {
      const results = {
        email: { valid: true, errors: [] },
        name: { valid: false, errors: ["Required", "Too short"] },
        age: { valid: false, errors: ["Invalid format"] },
      };

      const errors = getFormErrors(results);

      assert.equal(Object.keys(errors).length, 2);
      assert.deepEqual(errors.name, ["Required", "Too short"]);
      assert.deepEqual(errors.age, ["Invalid format"]);
    });

    it("should return empty object for valid form", () => {
      const results = {
        email: { valid: true, errors: [] },
        name: { valid: true, errors: [] },
      };

      const errors = getFormErrors(results);

      assert.equal(Object.keys(errors).length, 0);
    });
  });
});
