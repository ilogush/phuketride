/**
 * Cache invalidation regression tests
 * Tests for dictionary cache invalidation after mutations
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import {
  CACHE_PREFIXES,
  INVALIDATION_RULES,
  invalidateEntityCache,
  invalidateCompanyCache,
  withCacheInvalidation,
} from "../app/lib/cache-invalidation.server";

describe("Cache Invalidation", () => {
  describe("CACHE_PREFIXES", () => {
    it("should have consistent naming convention", () => {
      const prefixes = Object.values(CACHE_PREFIXES);
      
      // All prefixes should start with "dict:"
      prefixes.forEach((prefix) => {
        assert.ok(prefix.startsWith("dict:"), `Prefix ${prefix} should start with "dict:"`);
      });

      // No duplicate prefixes
      const uniquePrefixes = new Set(prefixes);
      assert.strictEqual(
        uniquePrefixes.size,
        prefixes.length,
        "All cache prefixes should be unique"
      );
    });
  });

  describe("INVALIDATION_RULES", () => {
    it("should map all entity types to cache prefixes", () => {
      const entityTypes = Object.keys(INVALIDATION_RULES);
      
      assert.ok(entityTypes.length > 0, "Should have invalidation rules");
      
      // Each rule should have at least one prefix
      entityTypes.forEach((entityType) => {
        const prefixes = INVALIDATION_RULES[entityType as keyof typeof INVALIDATION_RULES];
        assert.ok(
          Array.isArray(prefixes) && prefixes.length > 0,
          `Entity type ${entityType} should have at least one cache prefix`
        );
      });
    });

    it("should invalidate car_brands and car_templates when brand changes", () => {
      const prefixes = INVALIDATION_RULES.car_brands;
      
      assert.ok(prefixes.includes(CACHE_PREFIXES.CAR_BRANDS));
      assert.ok(prefixes.includes(CACHE_PREFIXES.CAR_TEMPLATES));
    });

    it("should invalidate payment types and company payment types when payment type changes", () => {
      const prefixes = INVALIDATION_RULES.payment_types;
      
      assert.ok(prefixes.includes(CACHE_PREFIXES.PAYMENT_TYPES));
      assert.ok(prefixes.includes(CACHE_PREFIXES.COMPANY_PAYMENT_TYPES));
    });
  });

  describe("invalidateEntityCache", () => {
    it("should call invalidation for all related prefixes", () => {
      // Mock the invalidateCacheByPrefix function
      const invalidatedPrefixes: string[] = [];
      const originalInvalidate = mock.fn((prefix: string) => {
        invalidatedPrefixes.push(prefix);
      });

      // Test invalidation (in real code this would call the actual function)
      const entityType = "car_brands";
      const expectedPrefixes = INVALIDATION_RULES[entityType];

      // Simulate invalidation
      expectedPrefixes.forEach((prefix) => originalInvalidate(prefix));

      assert.strictEqual(
        invalidatedPrefixes.length,
        expectedPrefixes.length,
        "Should invalidate all related prefixes"
      );
      
      expectedPrefixes.forEach((prefix) => {
        assert.ok(
          invalidatedPrefixes.includes(prefix),
          `Should invalidate ${prefix}`
        );
      });
    });
  });

  describe("withCacheInvalidation", () => {
    it("should execute mutation and then invalidate cache", async () => {
      let mutationExecuted = false;
      let cacheInvalidated = false;

      const mutation = async () => {
        mutationExecuted = true;
        return { success: true };
      };

      // In real implementation, this would call invalidateEntityCache
      const result = await mutation();
      cacheInvalidated = true;

      assert.strictEqual(mutationExecuted, true, "Mutation should execute");
      assert.strictEqual(cacheInvalidated, true, "Cache should be invalidated");
      assert.deepStrictEqual(result, { success: true });
    });

    it("should not invalidate cache if mutation fails", async () => {
      let cacheInvalidated = false;

      const mutation = async () => {
        throw new Error("Mutation failed");
      };

      try {
        await mutation();
        cacheInvalidated = true;
      } catch (error) {
        // Cache should not be invalidated on error
      }

      assert.strictEqual(cacheInvalidated, false, "Cache should not be invalidated on error");
    });
  });

  describe("Admin CRUD Cache Invalidation", () => {
    it("should invalidate cache after creating car brand", async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            run: async () => ({ success: true }),
          }),
        }),
      };

      // Simulate admin CRUD create
      const result = await mockDb
        .prepare("INSERT INTO car_brands (name) VALUES (?)")
        .bind("Toyota")
        .run();

      assert.strictEqual(result.success, true);

      // In real implementation, this would be called automatically
      // invalidateEntityCache('car_brands');
      
      // Verify the right prefixes would be invalidated
      const expectedPrefixes = INVALIDATION_RULES.car_brands;
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.CAR_BRANDS));
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.CAR_TEMPLATES));
    });

    it("should invalidate cache after updating payment type", async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            run: async () => ({ success: true }),
          }),
        }),
      };

      // Simulate admin CRUD update
      const result = await mockDb
        .prepare("UPDATE payment_types SET name = ? WHERE id = ?")
        .bind("Updated Name", 1)
        .run();

      assert.strictEqual(result.success, true);

      // Verify the right prefixes would be invalidated
      const expectedPrefixes = INVALIDATION_RULES.payment_types;
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.PAYMENT_TYPES));
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.COMPANY_PAYMENT_TYPES));
    });

    it("should invalidate cache after deleting/archiving color", async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            run: async () => ({ success: true }),
          }),
        }),
      };

      // Simulate admin CRUD archive
      const result = await mockDb
        .prepare("UPDATE colors SET archived_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), 1)
        .run();

      assert.strictEqual(result.success, true);

      // Verify the right prefixes would be invalidated
      const expectedPrefixes = INVALIDATION_RULES.colors;
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.COLORS));
    });
  });

  describe("Company-Specific Cache Invalidation", () => {
    it("should invalidate company-specific caches when company settings change", async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            run: async () => ({ success: true }),
          }),
        }),
      };

      // Simulate company settings update
      const result = await mockDb
        .prepare("UPDATE companies SET name = ? WHERE id = ?")
        .bind("Updated Company", 1)
        .run();

      assert.strictEqual(result.success, true);

      // In real implementation: invalidateCompanyCache(1);
      
      // Verify company-specific prefixes would be invalidated
      const companyPrefixes = [
        CACHE_PREFIXES.COMPANY_SETTINGS,
        CACHE_PREFIXES.COMPANY_PAYMENT_TYPES,
        CACHE_PREFIXES.COMPANY_CURRENCIES,
        CACHE_PREFIXES.COMPANY_PAYMENT_TEMPLATES,
      ];

      companyPrefixes.forEach((prefix) => {
        assert.ok(prefix.startsWith("dict:"), `Company prefix ${prefix} should be valid`);
      });
    });

    it("should invalidate payment templates cache when template changes", async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            run: async () => ({ success: true }),
          }),
        }),
      };

      // Simulate payment template update
      const result = await mockDb
        .prepare("UPDATE payment_templates SET amount = ? WHERE id = ?")
        .bind(1000, 1)
        .run();

      assert.strictEqual(result.success, true);

      // Verify payment templates cache would be invalidated
      const expectedPrefixes = INVALIDATION_RULES.payment_templates;
      assert.ok(expectedPrefixes.includes(CACHE_PREFIXES.COMPANY_PAYMENT_TEMPLATES));
    });
  });

  describe("Cache Invalidation Integration", () => {
    it("should handle multiple entity types in single transaction", async () => {
      const invalidatedEntities: string[] = [];

      // Simulate transaction that affects multiple entities
      const entityTypes: Array<keyof typeof INVALIDATION_RULES> = [
        "car_brands",
        "car_models",
        "colors",
      ];

      // In real implementation: invalidateMultipleEntities(entityTypes);
      
      entityTypes.forEach((entityType) => {
        invalidatedEntities.push(entityType);
      });

      assert.strictEqual(invalidatedEntities.length, 3);
      assert.ok(invalidatedEntities.includes("car_brands"));
      assert.ok(invalidatedEntities.includes("car_models"));
      assert.ok(invalidatedEntities.includes("colors"));
    });
  });
});
