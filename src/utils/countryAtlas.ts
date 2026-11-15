import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas50m from 'world-atlas/countries-50m.json';

export interface CountryProperties {
  name: string;
}

export type CountryFeature = Feature<Geometry, CountryProperties>;

export interface CountryListItem {
  id: string;
  name: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
}

/**
 * Unwrap a single ring of [lon, lat] coordinates so no adjacent segment
 * crosses more than 180 degrees of longitude (eliminates 360-degree lines
 * across Leaflet maps for Russia, Fiji, etc.).
 */
function unwrapRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const out: number[][] = [[ring[0][0], ring[0][1]]];
  let offset = 0;

  for (let i = 1; i < ring.length; i++) {
    const prevRawLon = ring[i - 1][0];
    const curRawLon = ring[i][0];
    const diff = curRawLon - prevRawLon;
    if (diff > 180) offset -= 360;
    else if (diff < -180) offset += 360;
    out.push([curRawLon + offset, ring[i][1]]);
  }
  return out;
}

function shiftPolygon(poly: number[][][], deltaLon: number): number[][][] {
  if (deltaLon === 0) return poly;
  return poly.map((ring) => ring.map(([lon, lat]) => [lon + deltaLon, lat]));
}

function getPolyMinMaxLon(poly: number[][][]): { minLon: number; maxLon: number; midLon: number } {
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const pt of poly[0] ?? []) {
    if (pt[0] < minLon) minLon = pt[0];
    if (pt[0] > maxLon) maxLon = pt[0];
  }
  return { minLon, maxLon, midLon: (minLon + maxLon) / 2 };
}

function normalizeCountryGeometry(geom: Geometry): Geometry {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(unwrapRing),
    };
  }

  if (geom.type === 'MultiPolygon') {
    const unwrappedPolys = geom.coordinates.map((poly) => poly.map(unwrapRing));

    // Detect if this country spans the 180° antimeridian (e.g. Russia, Fiji, USA, NZ, Kiribati)
    let hasFarWest = false;
    let hasFarEast = false;
    let totalVerticesEast = 0;
    let totalVerticesWest = 0;

    for (const poly of unwrappedPolys) {
      const { minLon, maxLon, midLon } = getPolyMinMaxLon(poly);
      const count = poly[0]?.length ?? 0;
      if (minLon < -140) hasFarWest = true;
      if (maxLon > 140) hasFarEast = true;
      if (midLon >= 0) totalVerticesEast += count;
      else totalVerticesWest += count;
    }

    if (!hasFarWest || !hasFarEast) {
      return { type: 'MultiPolygon', coordinates: unwrappedPolys };
    }

    const preferEast = totalVerticesEast >= totalVerticesWest;
    const alignedPolys = unwrappedPolys.map((poly) => {
      const { minLon, maxLon } = getPolyMinMaxLon(poly);
      if (preferEast && maxLon < -140) {
        return shiftPolygon(poly, 360);
      }
      if (!preferEast && minLon > 140) {
        return shiftPolygon(poly, -360);
      }
      return poly;
    });

    return { type: 'MultiPolygon', coordinates: alignedPolys };
  }

  return geom;
}

export function computeNormalizedBbox(geom: Geometry): [number, number, number, number] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visitRing = (ring: number[][]) => {
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  };

  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(visitRing);
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((poly) => poly.forEach(visitRing));
  }

  return [west, south, east, north];
}

let cachedGeoJson: FeatureCollection<Geometry, CountryProperties> | null = null;
let cachedCountryList: CountryListItem[] | null = null;

export function getNormalizedCountriesGeoJson(): FeatureCollection<Geometry, CountryProperties> {
  if (cachedGeoJson) return cachedGeoJson;

  const topology = worldAtlas50m as unknown as Parameters<typeof feature>[0];
  const objects = (
    worldAtlas50m as unknown as { objects: { countries: Parameters<typeof feature>[1] } }
  ).objects;

  const fc = feature(topology, objects.countries) as unknown as FeatureCollection<
    Geometry,
    CountryProperties
  >;

  const usedIds = new Set<string>();

  cachedGeoJson = {
    type: 'FeatureCollection',
    features: fc.features
      .filter((f) => f.properties?.name && f.properties.name !== 'Antarctica')
      .map((f, idx) => {
        const baseId = String(f.id ?? idx);
        let uniqueId = baseId;
        if (usedIds.has(uniqueId)) {
          uniqueId = `${baseId}-${idx}`;
        }
        usedIds.add(uniqueId);
        return {
          ...f,
          id: uniqueId,
          geometry: normalizeCountryGeometry(f.geometry),
        };
      }),
  };

  return cachedGeoJson;
}

export function getCountryList(): CountryListItem[] {
  if (cachedCountryList) return cachedCountryList;
  const fc = getNormalizedCountriesGeoJson();

  cachedCountryList = fc.features
    .filter((f) => Boolean(f.properties?.name))
    .map((f, idx) => ({
      id: String(f.id ?? idx),
      name: f.properties.name,
      bbox: computeNormalizedBbox(f.geometry),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedCountryList;
}
