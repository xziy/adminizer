import type { FilterOperator } from "../../models/FilterAP";
import type { CustomFieldHandlerDefinition } from "./CustomFieldHandler";
import { CustomConditionRegistry } from "./CustomConditionRegistry";

type GeoPoint = {
  lat: number;
  lng: number;
};

export type GeospatialRadiusMatcherOptions = {
  handlerId: string;
  latField: string;
  lngField: string;
  name?: string;
  description?: string;
  maxRadiusKm?: number;
};

export type GeospatialPolygonMatcherOptions = {
  handlerId: string;
  latField: string;
  lngField: string;
  name?: string;
  description?: string;
};

const SUPPORTED_OPERATORS: FilterOperator[] = ["eq"];
const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_RADIUS_KM = 5000;

/**
 * Build a radius-based geospatial matcher with SQL and in-memory fallback.
 */
export function createGeospatialRadiusMatcher(
  options: GeospatialRadiusMatcherOptions
): CustomFieldHandlerDefinition {
  const latField = normalizeIdentifier(options.latField);
  const lngField = normalizeIdentifier(options.lngField);
  const maxRadiusKm = options.maxRadiusKm ?? DEFAULT_MAX_RADIUS_KM;

  return {
    name: options.name ?? `${options.handlerId}-geo-radius`,
    description:
      options.description ?? `Geospatial radius matcher for (${latField}, ${lngField})`,
    operators: SUPPORTED_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for geospatial radius matcher` };
      }
      const parsed = parseRadiusInput(value, maxRadiusKm);
      if (!parsed.valid) {
        return parsed;
      }
      return { valid: true };
    },
    buildCondition: ({ adapterType, value }) => {
      const parsed = parseRadiusInput(value, maxRadiusKm);
      if (!parsed.valid) {
        return { inMemory: () => false };
      }

      const input = parsed.value;
      const inMemory = (record: Record<string, unknown>): boolean => {
        const recordLat = Number(record[latField]);
        const recordLng = Number(record[lngField]);
        if (!Number.isFinite(recordLat) || !Number.isFinite(recordLng)) {
          return false;
        }
        const distance = calculateDistanceKm(input.lat, input.lng, recordLat, recordLng);
        return distance <= input.radiusKm;
      };

      if (adapterType === "sequelize" || adapterType === "mysql") {
        const rawSQL =
          `(6371 * acos(` +
          `cos(radians(?)) * cos(radians(${latField})) * cos(radians(${lngField}) - radians(?)) + ` +
          `sin(radians(?)) * sin(radians(${latField}))` +
          `)) <= ?`;

        return {
          rawSQL,
          rawSQLParams: [input.lat, input.lng, input.lat, input.radiusKm],
          inMemory
        };
      }

      return { inMemory };
    }
  };
}

/**
 * Build a polygon-based geospatial matcher using point-in-polygon fallback.
 */
export function createGeospatialPolygonMatcher(
  options: GeospatialPolygonMatcherOptions
): CustomFieldHandlerDefinition {
  const latField = normalizeIdentifier(options.latField);
  const lngField = normalizeIdentifier(options.lngField);

  return {
    name: options.name ?? `${options.handlerId}-geo-polygon`,
    description:
      options.description ?? `Geospatial polygon matcher for (${latField}, ${lngField})`,
    operators: SUPPORTED_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for geospatial polygon matcher` };
      }
      const parsed = parsePolygonInput(value);
      if (!parsed.valid) {
        return parsed;
      }
      return { valid: true };
    },
    buildCondition: ({ adapterType, value }) => {
      const parsed = parsePolygonInput(value);
      if (!parsed.valid) {
        return { inMemory: () => false };
      }

      const points = parsed.value.points;
      const bounds = calculateBounds(points);

      const inMemory = (record: Record<string, unknown>): boolean => {
        const lat = Number(record[latField]);
        const lng = Number(record[lngField]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return false;
        }
        return isPointInPolygon({ lat, lng }, points);
      };

      if (adapterType === "sequelize" || adapterType === "mysql") {
        return {
          rawSQL:
            `${latField} BETWEEN ? AND ? AND ${lngField} BETWEEN ? AND ?`,
          rawSQLParams: [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng],
          inMemory
        };
      }

      return { inMemory };
    }
  };
}

/**
 * Register a radius matcher in the global custom condition registry.
 */
export function registerGeospatialRadiusMatcher(options: GeospatialRadiusMatcherOptions): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createGeospatialRadiusMatcher(options));
}

/**
 * Register a polygon matcher in the global custom condition registry.
 */
export function registerGeospatialPolygonMatcher(options: GeospatialPolygonMatcherOptions): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createGeospatialPolygonMatcher(options));
}

function parseRadiusInput(
  value: unknown,
  maxRadiusKm: number
): { valid: true; value: { lat: number; lng: number; radiusKm: number } } | { valid: false; reason: string } {
  const raw = value as Record<string, unknown>;
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  const radiusKm = Number(raw?.radiusKm ?? raw?.radius);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { valid: false, reason: "lat must be a finite number in range [-90, 90]" };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { valid: false, reason: "lng must be a finite number in range [-180, 180]" };
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return { valid: false, reason: "radiusKm must be a positive number" };
  }
  if (radiusKm > maxRadiusKm) {
    return { valid: false, reason: `radiusKm exceeds max radius ${maxRadiusKm}` };
  }

  return { valid: true, value: { lat, lng, radiusKm } };
}

function parsePolygonInput(
  value: unknown
): { valid: true; value: { points: GeoPoint[] } } | { valid: false; reason: string } {
  const raw = value as Record<string, unknown>;
  const points = Array.isArray(raw?.points) ? raw.points : null;
  if (!points || points.length < 3) {
    return { valid: false, reason: "polygon requires at least 3 points" };
  }

  const normalized: GeoPoint[] = [];
  for (const point of points) {
    const lat = Number((point as Record<string, unknown>)?.lat);
    const lng = Number((point as Record<string, unknown>)?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { valid: false, reason: "polygon lat must be a finite number in range [-90, 90]" };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { valid: false, reason: "polygon lng must be a finite number in range [-180, 180]" };
    }
    normalized.push({ lat, lng });
  }

  return { valid: true, value: { points: normalized } };
}

function normalizeIdentifier(identifier: string): string {
  const normalized = String(identifier ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid geospatial field identifier "${identifier}"`);
  }
  return normalized;
}

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateBounds(points: GeoPoint[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}

function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
