import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
<<<<<<< HEAD
=======
import readline from 'readline';
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type FirmsSourceId =
  | 'VIIRS_NOAA20_NRT'
  | 'VIIRS_NOAA21_NRT'
  | 'VIIRS_SNPP_NRT'
  | 'MODIS_NRT';

export interface FirmsSourceMeta {
  id: FirmsSourceId;
  label: string;
  shortLabel: string;
  instrument: 'VIIRS' | 'MODIS';
  resolution: string;
  shape: 'circle' | 'diamond' | 'triangle' | 'square';
  color: string;
  description: string;
}

export const FIRMS_SOURCES: FirmsSourceMeta[] = [
  {
    id: 'VIIRS_NOAA20_NRT',
    label: 'VIIRS NOAA-20 (JPSS-1)',
    shortLabel: 'NOAA-20',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'circle',
    color: '#FB923C',
    description: 'Joint Polar Satellite System-1 (NOAA-20) 375m I-band active fire detections.',
  },
  {
    id: 'VIIRS_NOAA21_NRT',
    label: 'VIIRS NOAA-21 (JPSS-2)',
    shortLabel: 'NOAA-21',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'diamond',
    color: '#FACC15',
    description: 'Joint Polar Satellite System-2 (NOAA-21) 375m near-real-time thermal hotspots.',
  },
  {
    id: 'VIIRS_SNPP_NRT',
    label: 'VIIRS Suomi-NPP',
    shortLabel: 'S-NPP',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'triangle',
    color: '#F97316',
    description: 'Suomi National Polar-orbiting Partnership 375m thermal anomaly feed.',
  },
  {
    id: 'MODIS_NRT',
    label: 'MODIS Terra & Aqua',
    shortLabel: 'MODIS',
    instrument: 'MODIS',
    resolution: '1 km',
    shape: 'square',
    color: '#BEF264',
    description: 'Collection 6.1 1km morning (Terra) and afternoon (Aqua) global fire detections.',
  },
];

const SOURCE_INDEX: Record<FirmsSourceId, number> = {
  VIIRS_NOAA20_NRT: 0,
  VIIRS_NOAA21_NRT: 1,
  VIIRS_SNPP_NRT: 2,
  MODIS_NRT: 3,
};

const DEFAULT_VIIRS_TO_MODIS_SCALE = 0.28;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface NormalizedFirmsRow {
  lat: number;
  lon: number;
  brightTi4: number;
  brightTi5: number;
  scan: number;
  track: number;
  acqDate: string;
  acqTime: string;
  satellite: string;
  instrument: string;
  source: FirmsSourceId;
  sourceIdx: number;
  confidenceRaw: string;
  confidenceTier: 'h' | 'n' | 'l';
  version: string;
  frp: number;
  daynight: 'D' | 'N';
}

interface CacheEntry {
  fetchedAt: number;
  rows: NormalizedFirmsRow[];
  datasetUsed: string;
}

<<<<<<< HEAD
const NRT_CACHE_TTL_MS = 15 * 60 * 1000;
const SP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MEM_CACHE_ENTRIES = 320;
=======
interface ServerArchiveStore {
  active: boolean;
  fileCount: number;
  totalRows: number;
  dateMin: string;
  dateMax: string;
  rows: NormalizedFirmsRow[];
}

const serverArchive: ServerArchiveStore = {
  active: false,
  fileCount: 0,
  totalRows: 0,
  dateMin: '',
  dateMax: '',
  rows: [],
};

const NRT_CACHE_TTL_MS = 15 * 60 * 1000;
const SP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MEM_CACHE_ENTRIES = 320;
const MAX_SERVER_ARCHIVE_ROWS = 250000;
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
const firmsCache = new Map<string, CacheEntry>();
const inflightFetches = new Map<string, Promise<{ rows: NormalizedFirmsRow[]; datasetUsed: string }>>();

const DISK_CACHE_DIR = path.resolve(__dirname, '.cache', 'firms');
<<<<<<< HEAD
try {
  fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
=======
const SERVER_ARCHIVE_DIR = path.resolve(__dirname, 'data', 'firms');
try {
  fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
  fs.mkdirSync(SERVER_ARCHIVE_DIR, { recursive: true });
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
} catch {
  // Ignore if filesystem is read-only
}

// Per-IP sliding-window rate limiter for public deployment protection
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQ = 90;
const ipRequests = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequests.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQ) {
    ipRequests.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  if (ipRequests.size > 2000) {
    for (const [k, v] of ipRequests.entries()) {
      if (v.length === 0 || now - v[v.length - 1] >= RATE_LIMIT_WINDOW_MS) {
        ipRequests.delete(k);
      }
    }
  }
  return false;
}

function setBoundedCache(key: string, entry: CacheEntry) {
  if (firmsCache.size >= MAX_MEM_CACHE_ENTRIES) {
    const oldestKey = firmsCache.keys().next().value;
    if (oldestKey) firmsCache.delete(oldestKey);
  }
  firmsCache.set(key, entry);
}

function normalizeConfidence(raw: string, instrument: string): 'h' | 'n' | 'l' {
  const val = raw.trim().toLowerCase();
  if (val === 'h' || val === 'high') return 'h';
  if (val === 'n' || val === 'nominal') return 'n';
  if (val === 'l' || val === 'low') return 'l';
  if (instrument.toUpperCase() === 'MODIS' || val !== '') {
    const num = Number(val);
    if (!Number.isNaN(num)) {
      if (num >= 80) return 'h';
      if (num >= 30) return 'n';
      return 'l';
    }
  }
  return 'n';
}

function padAcqTime(raw: string): string {
  return raw.trim().padStart(4, '0');
}

<<<<<<< HEAD
=======
function detectSourceId(satRaw: string, instRaw: string, fileName: string): FirmsSourceId {
  const sat = satRaw.trim().toUpperCase();
  const inst = instRaw.trim().toUpperCase();
  const fname = fileName.toUpperCase();
  if (inst === 'MODIS' || sat === 'TERRA' || sat === 'AQUA' || fname.includes('M-C61') || fname.includes('MODIS')) {
    return 'MODIS_NRT';
  }
  if (sat === 'N21' || sat === 'NOAA-21' || sat === 'J2' || fname.includes('J2V') || fname.includes('NOAA-21')) {
    return 'VIIRS_NOAA21_NRT';
  }
  if (sat === 'N20' || sat === 'NOAA-20' || sat === 'J1' || fname.includes('J1V') || fname.includes('NOAA-20')) {
    return 'VIIRS_NOAA20_NRT';
  }
  return 'VIIRS_SNPP_NRT';
}

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
function parseFirmsCsv(csvText: string, source: FirmsSourceId): NormalizedFirmsRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const iLat = idx('latitude');
  const iLon = idx('longitude');
  const iBright4 = idx('bright_ti4') !== -1 ? idx('bright_ti4') : idx('brightness');
  const iBright5 = idx('bright_ti5') !== -1 ? idx('bright_ti5') : idx('bright_t31');
  const iScan = idx('scan');
  const iTrack = idx('track');
  const iDate = idx('acq_date');
  const iTime = idx('acq_time');
  const iSat = idx('satellite');
  const iInst = idx('instrument');
  const iConf = idx('confidence');
  const iVer = idx('version');
  const iFrp = idx('frp');
  const iDn = idx('daynight');

  if (iLat === -1 || iLon === -1 || iDate === -1) return [];

  const sourceIdx = SOURCE_INDEX[source];
  const rows: NormalizedFirmsRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const lat = Number(cols[iLat]);
    const lon = Number(cols[iLon]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const instrument = (cols[iInst] ?? (source === 'MODIS_NRT' ? 'MODIS' : 'VIIRS')).trim();
    const confRaw = (cols[iConf] ?? 'n').trim();
    const dnRaw = (cols[iDn] ?? 'D').trim().toUpperCase();

    rows.push({
      lat,
      lon,
      brightTi4: Number(cols[iBright4]) || 0,
      brightTi5: Number(cols[iBright5]) || 0,
      scan: Number(cols[iScan]) || 0,
      track: Number(cols[iTrack]) || 0,
      acqDate: (cols[iDate] ?? '').trim(),
      acqTime: padAcqTime(cols[iTime] ?? '0'),
      satellite: (cols[iSat] ?? '').trim(),
      instrument,
      source,
      sourceIdx,
      confidenceRaw: confRaw,
      confidenceTier: normalizeConfidence(confRaw, instrument),
      version: (cols[iVer] ?? '').trim(),
      frp: Number(cols[iFrp]) || 0,
      daynight: dnRaw === 'N' ? 'N' : 'D',
    });
  }

  return rows;
}

<<<<<<< HEAD
=======
/**
 * Streams any .csv files inside /data/firms/ once on startup so every public
 * visitor automatically sees pre-loaded 1-year+ global CSV data with zero uploads.
 */
async function loadServerArchiveDir(): Promise<void> {
  if (!fs.existsSync(SERVER_ARCHIVE_DIR)) return;
  const csvFiles = fs
    .readdirSync(SERVER_ARCHIVE_DIR)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .sort();

  if (csvFiles.length === 0) {
    console.log('No CSV files in data/firms/ — using live NASA FIRMS API + cache.');
    return;
  }

  console.log(`Indexing ${csvFiles.length} server CSV file(s) from data/firms/...`);

  const retained: NormalizedFirmsRow[] = [];
  let totalRows = 0;
  let dateMin = '';
  let dateMax = '';

  for (const fileName of csvFiles) {
    console.log(`  Reading ${fileName}...`);
    const fullPath = path.join(SERVER_ARCHIVE_DIR, fileName);
    const stream = fs.createReadStream(fullPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers: string[] | null = null;
    let iLat = -1;
    let iLon = -1;
    let iBright4 = -1;
    let iBright5 = -1;
    let iScan = -1;
    let iTrack = -1;
    let iDate = -1;
    let iTime = -1;
    let iSat = -1;
    let iInst = -1;
    let iConf = -1;
    let iVer = -1;
    let iFrp = -1;
    let iDn = -1;

    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (!line) continue;

      if (!headers) {
        headers = line.split(',').map((h) => h.trim().toLowerCase());
        const idx = (n: string) => headers!.indexOf(n);
        iLat = idx('latitude');
        iLon = idx('longitude');
        iBright4 = idx('bright_ti4') !== -1 ? idx('bright_ti4') : idx('brightness');
        iBright5 = idx('bright_ti5') !== -1 ? idx('bright_ti5') : idx('bright_t31');
        iScan = idx('scan');
        iTrack = idx('track');
        iDate = idx('acq_date');
        iTime = idx('acq_time');
        iSat = idx('satellite');
        iInst = idx('instrument');
        iConf = idx('confidence');
        iVer = idx('version');
        iFrp = idx('frp');
        iDn = idx('daynight');
        continue;
      }

      if (iLat === -1 || iLon === -1 || iDate === -1) continue;

      // Reservoir sampling check BEFORE splitting/allocating objects for multi-million-row CSVs
      totalRows++;
      let replaceIdx = -1;
      if (retained.length >= MAX_SERVER_ARCHIVE_ROWS) {
        const j = Math.floor(Math.random() * totalRows);
        if (j >= MAX_SERVER_ARCHIVE_ROWS) {
          continue;
        }
        replaceIdx = j;
      }

      const cols = line.split(',');
      const lat = Number(cols[iLat]);
      const lon = Number(cols[iLon]);
      const acqDate = (cols[iDate] ?? '').trim();
      if (Number.isNaN(lat) || Number.isNaN(lon) || !acqDate) {
        totalRows--;
        continue;
      }

      if (!dateMin || acqDate < dateMin) dateMin = acqDate;
      if (!dateMax || acqDate > dateMax) dateMax = acqDate;

      const satRaw = (cols[iSat] ?? '').trim();
      const instRaw = (cols[iInst] ?? '').trim();
      const source = detectSourceId(satRaw, instRaw, fileName);
      const instrument = instRaw || (source === 'MODIS_NRT' ? 'MODIS' : 'VIIRS');
      const confRaw = (cols[iConf] ?? 'n').trim();
      const dnRaw = (cols[iDn] ?? 'D').trim().toUpperCase();

      const row: NormalizedFirmsRow = {
        lat,
        lon,
        brightTi4: Number(cols[iBright4]) || 0,
        brightTi5: Number(cols[iBright5]) || 0,
        scan: Number(cols[iScan]) || 0,
        track: Number(cols[iTrack]) || 0,
        acqDate,
        acqTime: padAcqTime(cols[iTime] ?? '0'),
        satellite: satRaw || (source === 'MODIS_NRT' ? 'MODIS' : 'VIIRS'),
        instrument,
        source,
        sourceIdx: SOURCE_INDEX[source],
        confidenceRaw: confRaw,
        confidenceTier: normalizeConfidence(confRaw, instrument),
        version: (cols[iVer] ?? '').trim(),
        frp: Number(cols[iFrp]) || 0,
        daynight: dnRaw === 'N' ? 'N' : 'D',
      };

      if (replaceIdx === -1) {
        retained.push(row);
      } else {
        retained[replaceIdx] = row;
      }
    }
  }

  if (totalRows > 0) {
    serverArchive.active = true;
    serverArchive.fileCount = csvFiles.length;
    serverArchive.totalRows = totalRows;
    serverArchive.dateMin = dateMin;
    serverArchive.dateMax = dateMax;
    serverArchive.rows = retained;
    console.log(
      `SlowBurn shared server archive loaded: ${csvFiles.length} file(s), ${totalRows.toLocaleString()} rows (${dateMin}..${dateMax})`
    );
  }
}

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
function resolveFirmsDataset(
  source: FirmsSourceId,
  targetDate: string | null
): { apiDataset: string | null; processingLevel: 'NRT' | 'SP' } {
  if (!targetDate) {
    return { apiDataset: source, processingLevel: 'NRT' };
  }

  const nrtCutoff = new Date(Date.now() - 72 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (targetDate >= nrtCutoff) {
    return { apiDataset: source, processingLevel: 'NRT' };
  }

  const spMap: Record<FirmsSourceId, { dataset: string; minDate: string }> = {
    MODIS_NRT: { dataset: 'MODIS_SP', minDate: '2000-11-01' },
    VIIRS_SNPP_NRT: { dataset: 'VIIRS_SNPP_SP', minDate: '2012-01-20' },
    VIIRS_NOAA20_NRT: { dataset: 'VIIRS_NOAA20_SP', minDate: '2018-04-01' },
    VIIRS_NOAA21_NRT: { dataset: 'VIIRS_NOAA21_SP', minDate: '2023-03-01' },
  };

  const info = spMap[source];
  if (targetDate < info.minDate) {
    return { apiDataset: null, processingLevel: 'SP' };
  }
  return { apiDataset: info.dataset, processingLevel: 'SP' };
}

function formatAreaForFirmsApi(bbox: [number, number, number, number] | null): string {
  if (!bbox) return 'world';
  let [west, south, east, north] = bbox;
  const width = east - west;
  const height = north - south;
  if (width > 80 || height > 70 || west < -180 || east > 180) {
    return 'world';
  }
  west = Math.max(-180, Math.min(180, west));
  east = Math.max(-180, Math.min(180, east));
  south = Math.max(-90, Math.min(90, south));
  north = Math.max(-90, Math.min(90, north));
  if (east <= west || north <= south) return 'world';
  return `${west.toFixed(2)},${south.toFixed(2)},${east.toFixed(2)},${north.toFixed(2)}`;
}

async function fetchFirmsArea(
  mapKey: string,
  source: FirmsSourceId,
  days: number,
  targetDate: string | null,
  areaParam: string
): Promise<{ rows: NormalizedFirmsRow[]; datasetUsed: 'NRT' | 'SP' }> {
  const { apiDataset, processingLevel } = resolveFirmsDataset(source, targetDate);
  if (!apiDataset) {
    return { rows: [], datasetUsed: processingLevel };
  }

  const safeAreaKey = areaParam.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cacheKey = `${apiDataset}__${safeAreaKey}__${days}__${targetDate ?? 'latest'}`;
  const ttl = processingLevel === 'SP' ? SP_CACHE_TTL_MS : NRT_CACHE_TTL_MS;

  const memCached = firmsCache.get(cacheKey);
  if (memCached && Date.now() - memCached.fetchedAt < ttl) {
    return { rows: memCached.rows, datasetUsed: processingLevel };
  }

  const diskPath = path.join(DISK_CACHE_DIR, `${cacheKey}.json`);
  let staleDiskRows: NormalizedFirmsRow[] | null = null;
  try {
    if (fs.existsSync(diskPath)) {
      const stat = fs.statSync(diskPath);
      const rawDisk = JSON.parse(fs.readFileSync(diskPath, 'utf8')) as NormalizedFirmsRow[];
      staleDiskRows = rawDisk;
      const diskTtl = processingLevel === 'SP' ? Number.POSITIVE_INFINITY : 30 * 60 * 1000;
      if (Date.now() - stat.mtimeMs < diskTtl) {
        setBoundedCache(cacheKey, {
          fetchedAt: Date.now(),
          rows: rawDisk,
          datasetUsed: processingLevel,
        });
        return { rows: rawDisk, datasetUsed: processingLevel };
      }
    }
  } catch {
    // Ignore corrupt disk entry
  }

  const existing = inflightFetches.get(cacheKey);
  if (existing) {
    const res = await existing;
    return { rows: res.rows, datasetUsed: processingLevel };
  }

  const promise = (async () => {
    const dateSuffix = targetDate ? `/${targetDate}` : '';
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(
      mapKey
    )}/${apiDataset}/${areaParam}/${days}${dateSuffix}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      if (staleDiskRows && staleDiskRows.length > 0) {
        return { rows: staleDiskRows, datasetUsed: apiDataset };
      }
      throw new Error(`Unable to reach NASA FIRMS feed for ${source}`);
    }

    if (!response.ok) {
      if (staleDiskRows && staleDiskRows.length > 0) {
        return { rows: staleDiskRows, datasetUsed: apiDataset };
      }
      const errBody = await response.text().catch(() => '');
      const isThrottle =
        response.status === 429 ||
        (response.status === 400 && errBody.toLowerCase().includes('exceed'));
      throw new Error(
        isThrottle
          ? `NASA FIRMS quota temporarily throttled for ${source} (wait a minute & retry)`
          : `NASA FIRMS feed ${source} returned status ${response.status}`
      );
    }

    const text = await response.text();
    if (
      text.startsWith('Invalid MAP_KEY') ||
      text.startsWith('Error') ||
      text.includes('<!DOCTYPE html>')
    ) {
      if (staleDiskRows && staleDiskRows.length > 0) {
        return { rows: staleDiskRows, datasetUsed: apiDataset };
      }
      throw new Error(`Upstream NASA FIRMS message for ${source}`);
    }

    let rows = parseFirmsCsv(text, source);
    let finalLevel: 'NRT' | 'SP' = processingLevel;

    // NASA FIRMS _SP lags by ~2-4 months while _NRT stays available up to ~110-140 days back
    if (rows.length === 0 && processingLevel === 'SP' && targetDate) {
      const nrtFallbackCutoff = new Date(Date.now() - 140 * 86400000).toISOString().slice(0, 10);
      if (targetDate >= nrtFallbackCutoff) {
        try {
          const fbUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(
            mapKey
          )}/${source}/${areaParam}/${days}${dateSuffix}`;
          const fbRes = await fetch(fbUrl);
          if (fbRes.ok) {
            const fbText = await fbRes.text();
            if (!fbText.startsWith('Invalid') && !fbText.startsWith('Error')) {
              const fbRows = parseFirmsCsv(fbText, source);
              if (fbRows.length > 0) {
                rows = fbRows;
                finalLevel = 'NRT';
              }
            }
          }
        } catch {
          // Keep empty SP result if fallback fails
        }
      }
    }

    setBoundedCache(cacheKey, {
      fetchedAt: Date.now(),
      rows,
      datasetUsed: finalLevel,
    });

    if (rows.length > 0) {
      try {
        fs.writeFileSync(diskPath, JSON.stringify(rows));
      } catch {
        // Ignore disk write failure
      }
    }

    return { rows, datasetUsed: finalLevel };
  })();

  inflightFetches.set(cacheKey, promise);
  try {
    const res = await promise;
    return { rows: res.rows, datasetUsed: processingLevel };
  } finally {
    inflightFetches.delete(cacheKey);
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function parseSourcesParam(raw: unknown): FirmsSourceId[] {
  const validIds = new Set<FirmsSourceId>(FIRMS_SOURCES.map((s) => s.id));
  if (typeof raw !== 'string' || !raw.trim() || raw.trim().toUpperCase() === 'ALL') {
    return FIRMS_SOURCES.map((s) => s.id);
  }
  const picked = raw
    .split(',')
    .map((s) => s.trim() as FirmsSourceId)
    .filter((s) => validIds.has(s));
  return picked.length > 0 ? picked : FIRMS_SOURCES.map((s) => s.id);
}

function parseBboxParam(raw: unknown): [number, number, number, number] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parts = raw.split(',').map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (south < -90 || north > 90 || north <= south || east <= west) return null;
  return [west, south, east, north];
}

function parseDateParam(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (trimmed < '2000-11-01' || trimmed > today) return null;
  return trimmed;
}

function applyRowFilters(
  rows: NormalizedFirmsRow[],
  confidenceFilter: string,
  daynightFilter: string,
  bbox: [number, number, number, number] | null,
  sourceSet?: Set<FirmsSourceId>,
  startDate?: string,
  endDate?: string
): NormalizedFirmsRow[] {
  return rows.filter((r) => {
    if (sourceSet && !sourceSet.has(r.source)) return false;
    if (confidenceFilter === 'high' && r.confidenceTier !== 'h') return false;
    if (confidenceFilter === 'nominal_plus' && r.confidenceTier === 'l') return false;
    if (daynightFilter === 'D' && r.daynight !== 'D') return false;
    if (daynightFilter === 'N' && r.daynight !== 'N') return false;
    if (startDate && r.acqDate < startDate) return false;
    if (endDate && r.acqDate > endDate) return false;
    if (bbox) {
      const [west, south, east, north] = bbox;
      if (r.lat < south || r.lat > north) return false;
      const inPrimary = r.lon >= west && r.lon <= east;
      const inWrappedEast = east > 180 && r.lon + 360 >= west && r.lon + 360 <= east;
      const inWrappedWest = west < -180 && r.lon - 360 >= west && r.lon - 360 <= east;
      if (!inPrimary && !inWrappedEast && !inWrappedWest) return false;
    }
    return true;
  });
}

function computeClusterKey(r: NormalizedFirmsRow): string {
  return `${r.acqDate}_${Math.round(r.lat / 0.045)}_${Math.round(r.lon / 0.045)}`;
}

function buildAggregatedResponse(
  filtered: NormalizedFirmsRow[],
  days: number,
  targetDate: string | null,
  sources: FirmsSourceId[],
  maxPoints: number,
  feedErrors: Record<string, string>,
  processingLevels: Record<string, 'NRT' | 'SP'>,
<<<<<<< HEAD
  dataSource: 'live-api' | 'sampled-sp-archive'
=======
  dataSource: 'live-api' | 'sampled-sp-archive' | 'server-csv-archive'
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
) {
  let peakFrp = 0;
  let totalFrpMw = 0;
  let sumBright = 0;
  let dayCount = 0;
  let nightCount = 0;
  let modisRawCount = 0;
  let viirsRawCount = 0;
  const confCounts = { h: 0, n: 0, l: 0 };
  const clusterSet = new Set<string>();

  const bySourceMap = new Map<
    FirmsSourceId,
    { count: number; sumFrp: number; peakFrp: number; highConf: number }
  >();
  FIRMS_SOURCES.forEach((s) =>
    bySourceMap.set(s.id, { count: 0, sumFrp: 0, peakFrp: 0, highConf: 0 })
  );

  const dailyMap = new Map<
    string,
    { count: number; sumFrp: number; highCount: number }
  >();

  for (const r of filtered) {
    if (r.frp > peakFrp) peakFrp = r.frp;
    totalFrpMw += r.frp;
    sumBright += r.brightTi4;
    if (r.daynight === 'D') dayCount++;
    else nightCount++;
    confCounts[r.confidenceTier]++;
    if (r.source === 'MODIS_NRT') modisRawCount++;
    else viirsRawCount++;
    clusterSet.add(computeClusterKey(r));

    const sEntry = bySourceMap.get(r.source);
    if (sEntry) {
      sEntry.count++;
      sEntry.sumFrp += r.frp;
      if (r.frp > sEntry.peakFrp) sEntry.peakFrp = r.frp;
      if (r.confidenceTier === 'h') sEntry.highConf++;
    }

    const dEntry = dailyMap.get(r.acqDate) ?? { count: 0, sumFrp: 0, highCount: 0 };
    dEntry.count++;
    dEntry.sumFrp += r.frp;
    if (r.confidenceTier === 'h') dEntry.highCount++;
    dailyMap.set(r.acqDate, dEntry);
  }

  let viirsToModisScale = DEFAULT_VIIRS_TO_MODIS_SCALE;
  if (modisRawCount >= 10 && viirsRawCount >= 20) {
    viirsToModisScale = Math.min(0.65, Math.max(0.15, modisRawCount / viirsRawCount));
  }
  const harmonizedIndex = Math.round(modisRawCount + viirsRawCount * viirsToModisScale);

  const totalDetections = filtered.length;
  const bySource = FIRMS_SOURCES.map((meta) => {
    const entry = bySourceMap.get(meta.id)!;
    return {
      ...meta,
      count: entry.count,
      meanFrp: entry.count ? Number((entry.sumFrp / entry.count).toFixed(2)) : 0,
      peakFrp: Number(entry.peakFrp.toFixed(2)),
      highConf: entry.highConf,
    };
  });

  const dailySeries = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      label: date.slice(5).replace('-', '/'),
      detections: val.count,
      meanFrp: val.count ? Number((val.sumFrp / val.count).toFixed(2)) : 0,
      highCount: val.highCount,
    }));

  let mapSlice: NormalizedFirmsRow[];
  if (filtered.length <= maxPoints) {
    mapSlice = filtered;
  } else {
    // Keep top 4,000 extreme FRP fires + uniform stride across the full date/globe span
    const strideStep = filtered.length / (maxPoints - 4000);
    const picked = new Set<number>();
    const sample: NormalizedFirmsRow[] = [];

    const topIdx = filtered
      .map((r, i) => ({ frp: r.frp, i }))
      .sort((a, b) => b.frp - a.frp)
      .slice(0, 4000);
    for (let k = 0; k < topIdx.length; k++) {
      picked.add(topIdx[k].i);
      sample.push(filtered[topIdx[k].i]);
    }
    for (let cursor = 0; sample.length < maxPoints && cursor < filtered.length; cursor += strideStep) {
      const idx = Math.floor(cursor);
      if (!picked.has(idx)) {
        picked.add(idx);
        sample.push(filtered[idx]);
      }
    }
    mapSlice = sample;
  }
  const points = mapSlice.map((r) => [
    Number(r.lon.toFixed(4)),
    Number(r.lat.toFixed(4)),
    r.sourceIdx,
    Number(r.frp.toFixed(2)),
    r.confidenceTier === 'h' ? 2 : r.confidenceTier === 'n' ? 1 : 0,
    Number(r.brightTi4.toFixed(1)),
    r.acqDate,
    r.acqTime,
    r.daynight === 'N' ? 1 : 0,
  ]);

  const tableRows = [...filtered]
    .sort((a, b) => {
      const dateCmp = b.acqDate.localeCompare(a.acqDate);
      if (dateCmp !== 0) return dateCmp;
      const timeCmp = b.acqTime.localeCompare(a.acqTime);
      if (timeCmp !== 0) return timeCmp;
      return b.frp - a.frp;
    })
    .slice(0, 300);

  return {
    meta: {
      days,
      date: targetDate ?? undefined,
      sources,
      fetchedAt: new Date().toISOString(),
      totalDetections,
      displayedPoints: points.length,
      truncatedMapPoints: filtered.length > points.length,
      feedErrors,
      processingLevels,
      dataSource,
    },
    summary: {
      totalDetections,
      harmonizedIndex,
      fireEventClusters: clusterSet.size,
      viirsToModisScale: Number(viirsToModisScale.toFixed(3)),
      modisRawCount,
      viirsRawCount,
      totalFrpMw: Number(totalFrpMw.toFixed(1)),
      peakFrp: Number(peakFrp.toFixed(2)),
      meanFrp: totalDetections ? Number((totalFrpMw / totalDetections).toFixed(2)) : 0,
      meanBrightTi4: totalDetections ? Number((sumBright / totalDetections).toFixed(1)) : 0,
      dayCount,
      nightCount,
      confidenceCounts: confCounts,
    },
    bySource,
    dailySeries,
    points,
    tableRows,
  };
}

/**
 * Fetches quota-safe multi-window NASA FIRMS _SP/_NRT data for 30d / 90d / 365d
<<<<<<< HEAD
 * using the configured FIRMS_MAP_KEY.
=======
 * when no local server CSV archive is loaded in /data/firms/.
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
 */
async function fetchMultiWindowSpan(
  mapKey: string,
  sources: FirmsSourceId[],
  spanDays: number,
  areaParam: string
): Promise<{
  rows: NormalizedFirmsRow[];
  feedErrors: Record<string, string>;
  processingLevels: Record<string, 'NRT' | 'SP'>;
}> {
  const isWorld = areaParam === 'world';
  const anchorCount = isWorld
    ? spanDays <= 30
      ? 4
      : spanDays <= 90
      ? 6
      : 8
    : spanDays <= 30
    ? 6
    : spanDays <= 90
    ? 8
    : 12;
  const perCallDays = isWorld ? 2 : 5;
  const querySources = sources;

  const anchorDates: string[] = [];
  const minBack = perCallDays - 1;
  const maxBack = Math.max(minBack, spanDays - perCallDays);
  const stepDays = Math.max(
    perCallDays,
    Math.floor((maxBack - minBack) / Math.max(1, anchorCount - 1))
  );
  for (let i = 0; i < anchorCount; i++) {
    const daysBack = Math.min(maxBack, minBack + i * stepDays);
    const d = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!anchorDates.includes(d)) anchorDates.push(d);
  }

  const tasks: Array<
    () => Promise<{
      src: FirmsSourceId;
      ok: boolean;
      rows: NormalizedFirmsRow[];
      level?: 'NRT' | 'SP';
      err?: string;
    }>
  > = [];

  for (const src of querySources) {
    for (const dateStr of anchorDates) {
      tasks.push(async () => {
        try {
          const r = await fetchFirmsArea(mapKey, src, perCallDays, dateStr, areaParam);
          return { src, ok: true, rows: r.rows, level: r.datasetUsed };
        } catch (err) {
          return {
            src,
            ok: false,
            rows: [],
            err: err instanceof Error ? err.message : 'Fetch failed',
          };
        }
      });
    }
  }

  const settled = await runWithConcurrency(tasks, 6);
  const allRows: NormalizedFirmsRow[] = [];
  const dedup = new Set<string>();
  const feedErrors: Record<string, string> = {};
  const processingLevels: Record<string, 'NRT' | 'SP'> = {};

  for (const item of settled) {
    if (item.ok) {
      if (item.level) processingLevels[item.src] = item.level;
      for (const r of item.rows) {
        const key = `${r.source}_${r.acqDate}_${r.acqTime}_${r.lat.toFixed(4)}_${r.lon.toFixed(4)}`;
        if (!dedup.has(key)) {
          dedup.add(key);
          allRows.push(r);
        }
      }
    } else if (item.err) {
      feedErrors[item.src] = item.err;
    }
  }

  return { rows: allRows, feedErrors, processingLevels };
}

function clampRegionBboxForCalendar(
  bbox: [number, number, number, number] | null
): { bbox: [number, number, number, number]; clampedNotice: boolean } {
  if (!bbox) {
    return { bbox: [-125, 31, -112, 43], clampedNotice: false };
  }
  let [west, south, east, north] = bbox;
  const maxSpan = 35;
  let clampedNotice = false;
  if (east - west > maxSpan) {
    const midX = (west + east) / 2;
    west = midX - maxSpan / 2;
    east = midX + maxSpan / 2;
    clampedNotice = true;
  }
  if (north - south > maxSpan) {
    const midY = (south + north) / 2;
    south = midY - maxSpan / 2;
    north = midY + maxSpan / 2;
    clampedNotice = true;
  }
  west = Math.max(-180, Math.min(180, west));
  east = Math.max(-180, Math.min(180, east));
  south = Math.max(-85, Math.min(85, south));
  north = Math.max(-85, Math.min(85, north));
  if (east <= west) {
    west = -125;
    east = -112;
  }
  return { bbox: [west, south, east, north], clampedNotice };
}

async function startServer() {
  console.log('Starting SlowBurn server...');
<<<<<<< HEAD
=======
  await loadServerArchiveDir();
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4

  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/api/firms', (req, res, next) => {
    if (req.path === '/feeds' || req.path === '/status') {
      next();
      return;
    }
    const clientIp = req.ip || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: 'Rate limit reached. Please wait a few seconds before making more requests.',
      });
      return;
    }
    next();
  });

  app.get('/api/firms/feeds', (_req, res) => {
    res.json({ feeds: FIRMS_SOURCES });
  });

  app.get('/api/firms/status', (_req, res) => {
    res.json({
<<<<<<< HEAD
      mode: 'live-firms-map-key',
      hasMapKey: Boolean(process.env.FIRMS_MAP_KEY?.trim()),
    });
  });

=======
      active: serverArchive.active,
      fileCount: serverArchive.fileCount,
      totalRows: serverArchive.totalRows,
      dateMin: serverArchive.dateMin,
      dateMax: serverArchive.dateMax,
    });
  });

  function getServerArchiveWindow(
    sources: FirmsSourceId[],
    days: number,
    targetDate: string | null,
    confidenceFilter: string,
    daynightFilter: string,
    bbox: [number, number, number, number] | null
  ): NormalizedFirmsRow[] | null {
    if (!serverArchive.active) return null;
    const sourceSet = new Set<FirmsSourceId>(sources);

    if (targetDate) {
      if (targetDate < serverArchive.dateMin || targetDate > serverArchive.dateMax) {
        return null;
      }
      const endMs = new Date(`${targetDate}T00:00:00Z`).getTime();
      const startStr = new Date(endMs - (Math.min(days, 365) - 1) * 86400000)
        .toISOString()
        .slice(0, 10);
      return applyRowFilters(
        serverArchive.rows,
        confidenceFilter,
        daynightFilter,
        bbox,
        sourceSet,
        startStr,
        targetDate
      );
    }

    if (days > 5) {
      const endStr = serverArchive.dateMax;
      const endMs = new Date(`${endStr}T00:00:00Z`).getTime();
      const startStr = new Date(endMs - (days - 1) * 86400000).toISOString().slice(0, 10);
      return applyRowFilters(
        serverArchive.rows,
        confidenceFilter,
        daynightFilter,
        bbox,
        sourceSet,
        startStr,
        endStr
      );
    }

    return null;
  }

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
  app.get('/api/firms/global', async (req, res) => {
    const sources = parseSourcesParam(req.query.sources);
    const daysRaw = Number(req.query.days ?? 1);
    const days = Number.isNaN(daysRaw) ? 1 : Math.min(365, Math.max(1, Math.round(daysRaw)));
    const targetDate = parseDateParam(req.query.date);
    const confidenceFilter =
      typeof req.query.confidence === 'string' ? req.query.confidence : 'all';
    const daynightFilter =
      typeof req.query.daynight === 'string' ? req.query.daynight : 'all';
    const bbox = parseBboxParam(req.query.bbox);
    const maxPointsRaw = Number(req.query.maxPoints ?? 65000);
    const maxPoints = Number.isNaN(maxPointsRaw)
      ? 65000
      : Math.min(120000, Math.max(1000, maxPointsRaw));

<<<<<<< HEAD
=======
    // 1. Check Shared Server CSV Archive first for 30d/90d/1yr or covered historical dates
    const archiveSlice = getServerArchiveWindow(
      sources,
      days,
      targetDate,
      confidenceFilter,
      daynightFilter,
      bbox
    );
    if (archiveSlice) {
      res.json(
        buildAggregatedResponse(
          archiveSlice,
          days,
          targetDate,
          sources,
          maxPoints,
          {},
          {},
          'server-csv-archive'
        )
      );
      return;
    }

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
    const mapKey = process.env.FIRMS_MAP_KEY?.trim();
    if (!mapKey) {
      res.status(500).json({
        error: 'FIRMS_MAP_KEY is not configured on the server environment.',
      });
      return;
    }

    const areaParam = targetDate || days > 5 ? formatAreaForFirmsApi(bbox) : 'world';

    try {
      // 2. Multi-window 30d / 90d / 365d trace via NASA FIRMS _SP
      if (!targetDate && days > 5) {
        const spanRes = await fetchMultiWindowSpan(mapKey, sources, days, areaParam);
        const filtered = applyRowFilters(
          spanRes.rows,
          confidenceFilter,
          daynightFilter,
          bbox
        );
        if (filtered.length === 0 && Object.keys(spanRes.feedErrors).length > 0) {
          const firstErr =
            Object.values(spanRes.feedErrors)[0] || 'Upstream NASA FIRMS unavailable';
          res.status(503).json({ error: firstErr });
          return;
        }
        res.json(
          buildAggregatedResponse(
            filtered,
            days,
            null,
            sources,
            maxPoints,
            spanRes.feedErrors,
            spanRes.processingLevels,
            'sampled-sp-archive'
          )
        );
        return;
      }

      // 3. Standard 1-5 day window (live _NRT or historical _SP date)
      // NASA /world/1 only returns current UTC date (nearly empty right after 00:00 UTC);
      // for live 1d, fetch 2 UTC days and filter to the trailing 24 hours.
      const useRolling24h = !targetDate && days === 1;
      const apiDays = useRolling24h ? 2 : Math.min(5, days);
      const cutoffMs = useRolling24h ? Date.now() - 24 * 60 * 60 * 1000 : 0;

      const results = await Promise.allSettled(
        sources.map((src) => fetchFirmsArea(mapKey, src, apiDays, targetDate, areaParam))
      );

      const allRaw: NormalizedFirmsRow[] = [];
      const feedErrors: Record<string, string> = {};
      const processingLevels: Record<string, 'NRT' | 'SP'> = {};

      results.forEach((result, i) => {
        const src = sources[i];
        if (result.status === 'fulfilled') {
          const rows = result.value.rows;
          for (let k = 0; k < rows.length; k++) {
            const r = rows[k];
            if (useRolling24h) {
              const ts = Date.parse(
                `${r.acqDate}T${r.acqTime.slice(0, 2)}:${r.acqTime.slice(2, 4)}:00Z`
              );
              if (!Number.isNaN(ts) && ts < cutoffMs) continue;
            }
            allRaw.push(r);
          }
          processingLevels[src] = result.value.datasetUsed;
        } else {
          feedErrors[src] =
            result.reason instanceof Error ? result.reason.message : 'Fetch failed';
        }
      });

      const filtered = applyRowFilters(allRaw, confidenceFilter, daynightFilter, bbox);
      if (filtered.length === 0 && Object.keys(feedErrors).length > 0) {
        const firstErr = Object.values(feedErrors)[0] || 'Upstream NASA FIRMS unavailable';
        res.status(503).json({ error: firstErr });
        return;
      }
      res.json(
        buildAggregatedResponse(
          filtered,
          apiDays,
          targetDate,
          sources,
          maxPoints,
          feedErrors,
          processingLevels,
          'live-api'
        )
      );
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Failed to fetch NASA FIRMS data',
      });
    }
  });

  async function buildCalendarData(
    mapKey: string | undefined,
    rawBbox: [number, number, number, number] | null,
    regionName: string,
    confidenceFilter: string
  ) {
<<<<<<< HEAD
=======
    // If shared server archive covers >= 60 days, build calendar directly from server CSVs
    if (serverArchive.active && serverArchive.rows.length > 0) {
      const filteredRows = applyRowFilters(
        serverArchive.rows,
        confidenceFilter,
        'all',
        rawBbox
      );
      const ymMap = new Map<
        string,
        {
          year: number;
          month: number;
          rawModis: number;
          rawViirs: number;
          totalFrpMw: number;
          clusters: Set<string>;
          days: Set<string>;
        }
      >();
      let overlapModis = 0;
      let overlapViirs = 0;
      const flags = new Map<string, { m: number; v: number }>();

      for (const r of filteredRows) {
        if (r.acqDate.length < 7) continue;
        const ym = r.acqDate.slice(0, 7);
        const f = flags.get(ym) ?? { m: 0, v: 0 };
        if (r.source === 'MODIS_NRT') f.m++;
        else f.v++;
        flags.set(ym, f);
      }
      for (const f of flags.values()) {
        if (f.m > 0 && f.v > 0) {
          overlapModis += f.m;
          overlapViirs += f.v;
        }
      }
      const calibrationFactor =
        overlapModis >= 15 && overlapViirs >= 30
          ? Math.min(0.65, Math.max(0.15, overlapModis / overlapViirs))
          : DEFAULT_VIIRS_TO_MODIS_SCALE;

      for (const r of filteredRows) {
        if (r.acqDate.length < 7) continue;
        const year = Number(r.acqDate.slice(0, 4));
        const month = Number(r.acqDate.slice(5, 7));
        const ym = r.acqDate.slice(0, 7);
        let e = ymMap.get(ym);
        if (!e) {
          e = {
            year,
            month,
            rawModis: 0,
            rawViirs: 0,
            totalFrpMw: 0,
            clusters: new Set(),
            days: new Set(),
          };
          ymMap.set(ym, e);
        }
        if (r.source === 'MODIS_NRT') e.rawModis++;
        else e.rawViirs++;
        e.totalFrpMw += r.frp;
        e.clusters.add(computeClusterKey(r));
        e.days.add(r.acqDate);
      }

      const rawCells = Array.from(ymMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, e]) => ({
          year: e.year,
          month: e.month,
          ym,
          rawModis: e.rawModis,
          rawViirs: e.rawViirs,
          rawTotal: e.rawModis + e.rawViirs,
          harmonizedIndex:
            e.rawModis > 0 && e.rawViirs > 0
              ? Math.round((e.rawModis + e.rawViirs * calibrationFactor) / 2)
              : Math.round(e.rawModis + e.rawViirs * calibrationFactor),
          clusteredEvents: e.clusters.size,
          totalFrpMw: Number(e.totalFrpMw.toFixed(1)),
          sampleDays: e.days.size,
        }));

      if (rawCells.length >= 6) {
        const baselineSums = Array.from({ length: 12 }, () => ({ sumH: 0, sumRaw: 0, count: 0 }));
        for (const c of rawCells) {
          const b = baselineSums[c.month - 1];
          b.sumH += c.harmonizedIndex;
          b.sumRaw += c.rawTotal;
          b.count++;
        }
        const monthlyBaseline = baselineSums.map((b, i) => ({
          month: i + 1,
          label: MONTH_LABELS[i],
          meanHarmonizedIndex: b.count ? Number((b.sumH / b.count).toFixed(1)) : 0,
          meanRawTotal: b.count ? Number((b.sumRaw / b.count).toFixed(1)) : 0,
        }));
        const cells = rawCells.map((c) => {
          const base = monthlyBaseline[c.month - 1]?.meanHarmonizedIndex ?? 0;
          return {
            ...c,
            anomalyPct: base > 0 ? Number((((c.harmonizedIndex - base) / base) * 100).toFixed(1)) : null,
          };
        });
        const trailing12 = cells.slice(-12);
        let peakMonthIdx = 0;
        for (let i = 1; i < 12; i++) {
          if (monthlyBaseline[i].meanHarmonizedIndex > monthlyBaseline[peakMonthIdx].meanHarmonizedIndex) {
            peakMonthIdx = i;
          }
        }
        const yearTotals = new Map<number, number>();
        for (const c of cells) yearTotals.set(c.year, (yearTotals.get(c.year) ?? 0) + c.harmonizedIndex);
        let strongestYear: number | null = null;
        let maxYT = -1;
        for (const [y, v] of yearTotals.entries()) {
          if (v > maxYT) {
            maxYT = v;
            strongestYear = y;
          }
        }
        return {
          response: {
            meta: {
              bbox: rawBbox ?? [-180, -85, 180, 85],
              regionName: rawBbox ? regionName : 'Shared Server CSV Archive (Global)',
              calibrationFactor: Number(calibrationFactor.toFixed(3)),
              yearsCovered: Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => a - b),
              source: 'archive-csv' as const,
              fetchedAt: new Date().toISOString(),
            },
            summary: {
              trailing12MonthsHarmonized: trailing12.reduce((s, c) => s + c.harmonizedIndex, 0),
              trailing12MonthsRaw: trailing12.reduce((s, c) => s + c.rawTotal, 0),
              peakMonthLabel: MONTH_LABELS[peakMonthIdx],
              peakMonthIndex: peakMonthIdx + 1,
              strongestYear,
              latestMonthAnomalyPct: cells[cells.length - 1]?.anomalyPct ?? null,
            },
            monthlyBaseline,
            cells,
          },
          allHotspotRows: filteredRows,
        };
      }
    }

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
    if (!mapKey) {
      throw new Error('FIRMS_MAP_KEY is not configured.');
    }

    const { bbox } = clampRegionBboxForCalendar(rawBbox);
    const areaParam = formatAreaForFirmsApi(bbox);

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    const monthSlots: Array<{
      year: number;
      month: number;
      ym: string;
      sampleDate: string;
      includeViirs: boolean;
    }> = [];

    for (let back = 11; back >= 0; back--) {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1 - back, 15));
      const sampleDate =
        back === 0
          ? new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : d.toISOString().slice(0, 10);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      monthSlots.push({
        year: y,
        month: m,
        ym: `${y}-${String(m).padStart(2, '0')}`,
        sampleDate,
        includeViirs: true,
      });
    }

<<<<<<< HEAD
=======
    const benchmarkYears = [2005, 2010, 2015, 2020, currentYear - 2, currentYear - 1].filter(
      (y, idx, arr) => y >= 2001 && y <= currentYear - 1 && arr.indexOf(y) === idx
    );

    for (const yr of benchmarkYears) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${yr}-${String(m).padStart(2, '0')}`;
        if (!monthSlots.some((s) => s.ym === ym)) {
          monthSlots.push({
            year: yr,
            month: m,
            ym,
            sampleDate: `${yr}-${String(m).padStart(2, '0')}-15`,
            includeViirs: false,
          });
        }
      }
    }

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
    const tasks: Array<() => Promise<{ ym: string; rows: NormalizedFirmsRow[] }>> = [];
    for (const slot of monthSlots) {
      tasks.push(async () => {
        try {
          const r = await fetchFirmsArea(mapKey, 'MODIS_NRT', 5, slot.sampleDate, areaParam);
          return { ym: slot.ym, rows: r.rows };
        } catch {
          return { ym: slot.ym, rows: [] };
        }
      });
      if (slot.includeViirs) {
        tasks.push(async () => {
          try {
            const r = await fetchFirmsArea(mapKey, 'VIIRS_NOAA20_NRT', 5, slot.sampleDate, areaParam);
            return { ym: slot.ym, rows: r.rows };
          } catch {
            return { ym: slot.ym, rows: [] };
          }
        });
      }
    }

    const fetched = await runWithConcurrency(tasks, 6);

    const byMonth = new Map<string, NormalizedFirmsRow[]>();
    for (const item of fetched) {
      const filtered = applyRowFilters(item.rows, confidenceFilter, 'all', bbox);
      const list = byMonth.get(item.ym) ?? [];
      for (let k = 0; k < filtered.length; k++) list.push(filtered[k]);
      byMonth.set(item.ym, list);
    }

    let overlapModis = 0;
    let overlapViirs = 0;
    for (const slot of monthSlots) {
      if (!slot.includeViirs) continue;
      for (const r of byMonth.get(slot.ym) ?? []) {
        if (r.source === 'MODIS_NRT') overlapModis++;
        else overlapViirs++;
      }
    }
    const calibrationFactor =
      overlapModis >= 15 && overlapViirs >= 30
        ? Math.min(0.65, Math.max(0.15, overlapModis / overlapViirs))
        : DEFAULT_VIIRS_TO_MODIS_SCALE;

    const rawCells = monthSlots.map((slot) => {
      const rows = byMonth.get(slot.ym) ?? [];
      let rawModis = 0;
      let rawViirs = 0;
      let totalFrpMw = 0;
      const clusters = new Set<string>();
      for (const r of rows) {
        if (r.source === 'MODIS_NRT') rawModis++;
        else rawViirs++;
        totalFrpMw += r.frp;
        clusters.add(computeClusterKey(r));
      }
      const harmonizedIndex = slot.includeViirs
        ? rawModis > 0 && rawViirs > 0
          ? Math.round((rawModis + rawViirs * calibrationFactor) / 2)
          : Math.round(rawModis + rawViirs * calibrationFactor)
        : rawModis;

      return {
        year: slot.year,
        month: slot.month,
        ym: slot.ym,
        rawModis,
        rawViirs,
        rawTotal: rawModis + rawViirs,
        harmonizedIndex,
        clusteredEvents: clusters.size,
        totalFrpMw: Number(totalFrpMw.toFixed(1)),
        sampleDays: 5,
        rows,
      };
    });

    const baselineSums = Array.from({ length: 12 }, () => ({ sumH: 0, sumRaw: 0, count: 0 }));
    for (const c of rawCells) {
      const b = baselineSums[c.month - 1];
      b.sumH += c.harmonizedIndex;
      b.sumRaw += c.rawTotal;
      b.count++;
    }

    const monthlyBaseline = baselineSums.map((b, i) => ({
      month: i + 1,
      label: MONTH_LABELS[i],
      meanHarmonizedIndex: b.count ? Number((b.sumH / b.count).toFixed(1)) : 0,
      meanRawTotal: b.count ? Number((b.sumRaw / b.count).toFixed(1)) : 0,
    }));

    const cells = rawCells
      .sort((a, b) => a.ym.localeCompare(b.ym))
      .map(({ rows: _rows, ...rest }) => {
        const base = monthlyBaseline[rest.month - 1]?.meanHarmonizedIndex ?? 0;
        const anomalyPct =
          base > 0 ? Number((((rest.harmonizedIndex - base) / base) * 100).toFixed(1)) : null;
        return { ...rest, anomalyPct };
      });

    const trailing12 = cells.slice(-12);
    const trailing12MonthsHarmonized = trailing12.reduce((s, c) => s + c.harmonizedIndex, 0);
    const trailing12MonthsRaw = trailing12.reduce((s, c) => s + c.rawTotal, 0);

    let peakMonthIdx = 0;
    for (let i = 1; i < monthlyBaseline.length; i++) {
      if (monthlyBaseline[i].meanHarmonizedIndex > monthlyBaseline[peakMonthIdx].meanHarmonizedIndex) {
        peakMonthIdx = i;
      }
    }

    const yearTotals = new Map<number, number>();
    for (const c of cells) {
      yearTotals.set(c.year, (yearTotals.get(c.year) ?? 0) + c.harmonizedIndex);
    }
    let strongestYear: number | null = null;
    let maxYearTotal = -1;
    for (const [y, val] of yearTotals.entries()) {
      if (val > maxYearTotal) {
        maxYearTotal = val;
        strongestYear = y;
      }
    }

    const yearsCovered = Array.from(new Set(cells.map((c) => c.year))).sort((a, b) => a - b);
    const allHotspotRows = rawCells.flatMap((c) => c.rows);

    return {
      response: {
        meta: {
          bbox,
          regionName,
          calibrationFactor: Number(calibrationFactor.toFixed(3)),
          yearsCovered,
          source: 'live-sp-nrt' as const,
          fetchedAt: new Date().toISOString(),
        },
        summary: {
          trailing12MonthsHarmonized,
          trailing12MonthsRaw,
          peakMonthLabel: MONTH_LABELS[peakMonthIdx],
          peakMonthIndex: peakMonthIdx + 1,
          strongestYear,
          latestMonthAnomalyPct: cells[cells.length - 1]?.anomalyPct ?? null,
        },
        monthlyBaseline,
        cells,
      },
      allHotspotRows,
    };
  }

  app.get('/api/firms/calendar', async (req, res) => {
    const mapKey = process.env.FIRMS_MAP_KEY?.trim();
    const rawBbox = parseBboxParam(req.query.bbox);
    const regionName =
      typeof req.query.regionName === 'string' && req.query.regionName.trim()
        ? req.query.regionName.trim().slice(0, 80)
        : 'Western North America (Sampled Region)';
    const confidenceFilter =
      typeof req.query.confidence === 'string' ? req.query.confidence : 'all';

    try {
      const { response } = await buildCalendarData(mapKey, rawBbox, regionName, confidenceFilter);
      res.json(response);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to build burning calendar',
      });
    }
  });

  app.get('/api/firms/calendar.csv', async (req, res) => {
    const mapKey = process.env.FIRMS_MAP_KEY?.trim();
    const rawBbox = parseBboxParam(req.query.bbox);
    const regionName =
      typeof req.query.regionName === 'string' && req.query.regionName.trim()
        ? req.query.regionName.trim().slice(0, 80)
        : 'Selected Region';
    const confidenceFilter =
      typeof req.query.confidence === 'string' ? req.query.confidence : 'all';
    const format = req.query.format === 'hotspots' ? 'hotspots' : 'summary';

    try {
      const { response, allHotspotRows } = await buildCalendarData(
        mapKey,
        rawBbox,
        regionName,
        confidenceFilter
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      if (format === 'hotspots') {
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="slowburn-1yr-harmonized-hotspots.csv"'
        );
        const header =
          'latitude,longitude,bright_ti4,acq_date,acq_time,satellite,instrument,source,confidence,frp,daynight';
        const lines = allHotspotRows.map(
          (r) =>
            `${r.lat},${r.lon},${r.brightTi4},${r.acqDate},${r.acqTime},${r.satellite},${r.instrument},${r.source},${r.confidenceRaw},${r.frp},${r.daynight}`
        );
        res.send([header, ...lines].join('\n'));
      } else {
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="slowburn-burning-calendar-summary.csv"'
        );
        const header =
          'year,month,ym,harmonized_index,clustered_events,raw_modis,raw_viirs,raw_total,total_frp_mw,anomaly_pct';
        const lines = response.cells.map(
          (c) =>
            `${c.year},${c.month},${c.ym},${c.harmonizedIndex},${c.clusteredEvents},${c.rawModis},${c.rawViirs},${c.rawTotal},${c.totalFrpMw},${c.anomalyPct ?? ''}`
        );
        res.send([header, ...lines].join('\n'));
      }
    } catch (err) {
      res.status(502).send(err instanceof Error ? err.message : 'Calendar CSV export failed');
    }
  });

  app.get('/api/firms/export.csv', async (req, res) => {
    const sources = parseSourcesParam(req.query.sources);
    const daysRaw = Number(req.query.days ?? 1);
    const days = Number.isNaN(daysRaw) ? 1 : Math.min(365, Math.max(1, Math.round(daysRaw)));
    const targetDate = parseDateParam(req.query.date);
    const confidenceFilter =
      typeof req.query.confidence === 'string' ? req.query.confidence : 'all';
    const daynightFilter =
      typeof req.query.daynight === 'string' ? req.query.daynight : 'all';
    const bbox = parseBboxParam(req.query.bbox);

<<<<<<< HEAD
    try {
      let filtered: NormalizedFirmsRow[];
      const mapKey = process.env.FIRMS_MAP_KEY?.trim();
      if (!mapKey) {
        res.status(500).send('FIRMS_MAP_KEY not configured');
        return;
      }
      const areaParam = targetDate || days > 5 ? formatAreaForFirmsApi(bbox) : 'world';
      if (!targetDate && days > 5) {
        const spanRes = await fetchMultiWindowSpan(mapKey, sources, days, areaParam);
        filtered = applyRowFilters(spanRes.rows, confidenceFilter, daynightFilter, bbox);
      } else {
        const useRolling24h = !targetDate && days === 1;
        const apiDays = useRolling24h ? 2 : Math.min(5, days);
        const cutoffMs = useRolling24h ? Date.now() - 24 * 60 * 60 * 1000 : 0;
        const results = await Promise.allSettled(
          sources.map((src) => fetchFirmsArea(mapKey, src, apiDays, targetDate, areaParam))
        );
        const allRaw: NormalizedFirmsRow[] = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            const rows = r.value.rows;
            for (let k = 0; k < rows.length; k++) {
              const row = rows[k];
              if (useRolling24h) {
                const ts = Date.parse(
                  `${row.acqDate}T${row.acqTime.slice(0, 2)}:${row.acqTime.slice(2, 4)}:00Z`
                );
                if (!Number.isNaN(ts) && ts < cutoffMs) continue;
              }
              allRaw.push(row);
            }
          }
        });
        filtered = applyRowFilters(allRaw, confidenceFilter, daynightFilter, bbox);
=======
    const archiveSlice = getServerArchiveWindow(
      sources,
      days,
      targetDate,
      confidenceFilter,
      daynightFilter,
      bbox
    );

    try {
      let filtered: NormalizedFirmsRow[];
      if (archiveSlice) {
        filtered = archiveSlice;
      } else {
        const mapKey = process.env.FIRMS_MAP_KEY?.trim();
        if (!mapKey) {
          res.status(500).send('FIRMS_MAP_KEY not configured');
          return;
        }
        const areaParam = targetDate || days > 5 ? formatAreaForFirmsApi(bbox) : 'world';
        if (!targetDate && days > 5) {
          const spanRes = await fetchMultiWindowSpan(mapKey, sources, days, areaParam);
          filtered = applyRowFilters(spanRes.rows, confidenceFilter, daynightFilter, bbox);
        } else {
          const useRolling24h = !targetDate && days === 1;
          const apiDays = useRolling24h ? 2 : Math.min(5, days);
          const cutoffMs = useRolling24h ? Date.now() - 24 * 60 * 60 * 1000 : 0;
          const results = await Promise.allSettled(
            sources.map((src) => fetchFirmsArea(mapKey, src, apiDays, targetDate, areaParam))
          );
          const allRaw: NormalizedFirmsRow[] = [];
          results.forEach((r) => {
            if (r.status === 'fulfilled') {
              const rows = r.value.rows;
              for (let k = 0; k < rows.length; k++) {
                const row = rows[k];
                if (useRolling24h) {
                  const ts = Date.parse(
                    `${row.acqDate}T${row.acqTime.slice(0, 2)}:${row.acqTime.slice(2, 4)}:00Z`
                  );
                  if (!Number.isNaN(ts) && ts < cutoffMs) continue;
                }
                allRaw.push(row);
              }
            }
          });
          filtered = applyRowFilters(allRaw, confidenceFilter, daynightFilter, bbox);
        }
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
      }

      const header =
        'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,source,confidence,version,bright_ti5,frp,daynight';
      const lines = filtered.map(
        (r) =>
          `${r.lat},${r.lon},${r.brightTi4},${r.scan},${r.track},${r.acqDate},${r.acqTime},${r.satellite},${r.instrument},${r.source},${r.confidenceRaw},${r.version},${r.brightTi5},${r.frp},${r.daynight}`
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="slowburn-nasa-firms-${targetDate ?? `${days}d`}.csv"`
      );
      res.send([header, ...lines].join('\n'));
    } catch (error) {
      res.status(502).send(error instanceof Error ? error.message : 'CSV export failed');
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SlowBurn server running on http://localhost:${port}`);

    const mapKey = process.env.FIRMS_MAP_KEY?.trim();
    if (mapKey) {
      Promise.allSettled(
        FIRMS_SOURCES.map((s) => fetchFirmsArea(mapKey, s.id, 2, null, 'world'))
      ).catch(() => {});
    }
  });
}

startServer().catch((err) => {
  console.error('SlowBurn server failed to start:', err);
  process.exit(1);
});
