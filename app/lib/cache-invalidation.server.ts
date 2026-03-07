/**
 * Unified cache invalidation contract
 * All mutations that affect cached data must call appropriate invalidation functions
 */

import { invalidateCacheByPrefix, invalidateSettingsCaches } from "~/lib/dictionaries-cache.server";

/**
 * Cache key prefixes for different domains
 * Use these constants to ensure consistent naming
 */
export const CACHE_PREFIXES = {
  // Global dictionaries
  CAR_BRANDS: "dict:car_brands",
  CAR_MODELS: "dict:car_models",
  BODY_TYPES: "dict:body_types",
  FUEL_TYPES: "dict:fuel_types",
  COLORS: "dict:colors",
  PAYMENT_TYPES: "dict:payment_types",
  CURRENCIES: "dict:currencies",
  LOCATIONS: "dict:locations",
  DISTRICTS: "dict:districts",
  HOTELS: "dict:hotels",
  SEASONS: "dict:seasons",
  DURATIONS: "dict:durations",
  CAR_TEMPLATES: "dict:car_templates",

  // Company-specific
  COMPANY_PAYMENT_TYPES: "dict:company_payment_types",
  COMPANY_CURRENCIES: "dict:company_currencies",
  COMPANY_PAYMENT_TEMPLATES: "dict:company_payment_templates",
  COMPANY_SETTINGS: "dict:company_settings",
} as const;

/**
 * Invalidation rules by entity type
 * Maps entity mutations to required cache invalidations
 */
export const INVALIDATION_RULES = {
  // Car-related entities
  car_brands: [CACHE_PREFIXES.CAR_BRANDS, CACHE_PREFIXES.CAR_TEMPLATES],
  car_models: [CACHE_PREFIXES.CAR_MODELS, CACHE_PREFIXES.CAR_TEMPLATES],
  body_types: [CACHE_PREFIXES.BODY_TYPES, CACHE_PREFIXES.CAR_TEMPLATES],
  fuel_types: [CACHE_PREFIXES.FUEL_TYPES, CACHE_PREFIXES.CAR_TEMPLATES],
  colors: [CACHE_PREFIXES.COLORS],
  car_templates: [CACHE_PREFIXES.CAR_TEMPLATES],

  // Payment-related entities
  payment_types: [CACHE_PREFIXES.PAYMENT_TYPES, CACHE_PREFIXES.COMPANY_PAYMENT_TYPES],
  currencies: [CACHE_PREFIXES.CURRENCIES, CACHE_PREFIXES.COMPANY_CURRENCIES],

  // Location-related entities
  locations: [CACHE_PREFIXES.LOCATIONS],
  districts: [CACHE_PREFIXES.DISTRICTS],
  hotels: [CACHE_PREFIXES.HOTELS],

  // Pricing-related entities
  seasons: [CACHE_PREFIXES.SEASONS],
  durations: [CACHE_PREFIXES.DURATIONS],

  // Company-specific
  companies: [CACHE_PREFIXES.COMPANY_SETTINGS],
  payment_templates: [CACHE_PREFIXES.COMPANY_PAYMENT_TEMPLATES],
} as const;

/**
 * Invalidate cache for a specific entity type
 */
export function invalidateEntityCache(entityType: keyof typeof INVALIDATION_RULES): void {
  const prefixes = INVALIDATION_RULES[entityType];
  if (prefixes) {
    prefixes.forEach((prefix) => invalidateCacheByPrefix(prefix));
  }
}

/**
 * Invalidate all company-specific caches
 */
export function invalidateCompanyCache(companyId?: number | null): void {
  invalidateSettingsCaches(companyId);
  invalidateCacheByPrefix(CACHE_PREFIXES.COMPANY_PAYMENT_TYPES);
  invalidateCacheByPrefix(CACHE_PREFIXES.COMPANY_CURRENCIES);
  invalidateCacheByPrefix(CACHE_PREFIXES.COMPANY_PAYMENT_TEMPLATES);
}

/**
 * Invalidate all global dictionary caches
 */
export function invalidateAllDictionaries(): void {
  Object.values(CACHE_PREFIXES).forEach((prefix) => {
    invalidateCacheByPrefix(prefix);
  });
}

/**
 * Helper to invalidate multiple entity types at once
 */
export function invalidateMultipleEntities(entityTypes: Array<keyof typeof INVALIDATION_RULES>): void {
  entityTypes.forEach((entityType) => invalidateEntityCache(entityType));
}

/**
 * Mutation wrapper that automatically invalidates cache
 * Usage:
 *   await withCacheInvalidation(
 *     () => db.prepare("UPDATE car_brands ...").run(),
 *     ['car_brands']
 *   );
 */
export async function withCacheInvalidation<T>(
  mutation: () => Promise<T>,
  entityTypes: Array<keyof typeof INVALIDATION_RULES>
): Promise<T> {
  const result = await mutation();
  invalidateMultipleEntities(entityTypes);
  return result;
}

/**
 * Admin CRUD mutation wrapper with automatic cache invalidation
 */
export async function withAdminCrudInvalidation<T>(
  mutation: () => Promise<T>,
  entityType: keyof typeof INVALIDATION_RULES
): Promise<T> {
  return withCacheInvalidation(mutation, [entityType]);
}
