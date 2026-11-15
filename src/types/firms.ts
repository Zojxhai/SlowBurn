import satNoaa20Img from '../assets/images/sat_noaa20_jpss1_1794642336973.jpg';
import satNoaa21Img from '../assets/images/sat_noaa21_jpss2_1794642337554.jpg';
import satSuomiNppImg from '../assets/images/sat_suomi_npp_1794642337650.jpg';
import satModisImg from '../assets/images/sat_modis_terra_1794642339643.jpg';

export type FirmsSourceId =
  | 'VIIRS_NOAA20_NRT'
  | 'VIIRS_NOAA21_NRT'
  | 'VIIRS_SNPP_NRT'
  | 'MODIS_NRT';

export type ConfidenceFilter = 'all' | 'nominal_plus' | 'high';
export type DayNightFilter = 'all' | 'D' | 'N';

export interface FirmsSourceMeta {
  id: FirmsSourceId;
  label: string;
  shortLabel: string;
  instrument: 'VIIRS' | 'MODIS';
  resolution: string;
  shape: 'circle' | 'diamond' | 'triangle' | 'square';
  color: string;
  description: string;
  plainSummary: string;
  funFact: string;
  image: string;
}

export interface FirmsSourceSummary extends FirmsSourceMeta {
  count: number;
  meanFrp: number;
  peakFrp: number;
  highConf: number;
}

export interface FirmsTableRow {
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

// Tuple: [lon, lat, sourceIdx, frp, confIdx, brightTi4, acqDate, acqTime, daynightIdx]
export type FirmsMapPoint = [
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
  number
];

export interface DailySeriesPoint {
  date: string;
  label: string;
  detections: number;
  meanFrp: number;
  highCount: number;
}

export interface FirmsGlobalResponse {
  meta: {
    days: number;
    date?: string;
    sources: FirmsSourceId[];
    fetchedAt: string;
    totalDetections: number;
    displayedPoints: number;
    truncatedMapPoints: boolean;
    feedErrors: Record<string, string>;
    processingLevels?: Record<string, 'NRT' | 'SP'>;
    dataSource?: 'live-api' | 'sampled-sp-archive';
  };
  summary: {
    totalDetections: number;
    harmonizedIndex: number;
    fireEventClusters: number;
    viirsToModisScale: number;
    modisRawCount: number;
    viirsRawCount: number;
    totalFrpMw: number;
    peakFrp: number;
    meanFrp: number;
    meanBrightTi4: number;
    dayCount: number;
    nightCount: number;
    confidenceCounts: { h: number; n: number; l: number };
  };
  bySource: FirmsSourceSummary[];
  dailySeries: DailySeriesPoint[];
  points: FirmsMapPoint[];
  tableRows: FirmsTableRow[];
}

export interface SelectedCountry {
  id: string;
  name: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  isCustom?: boolean;
}

export interface CalendarMonthCell {
  year: number;
  month: number; // 1-12
  ym: string; // YYYY-MM
  rawModis: number;
  rawViirs: number;
  rawTotal: number;
  harmonizedIndex: number;
  clusteredEvents: number;
  totalFrpMw: number;
  sampleDays: number;
  anomalyPct: number | null; // % vs historical month baseline
}

export interface CalendarResponse {
  meta: {
    bbox: [number, number, number, number];
    regionName: string;
    calibrationFactor: number;
    yearsCovered: number[];
    source: 'live-sp-nrt';
    fetchedAt: string;
  };
  summary: {
    trailing12MonthsHarmonized: number;
    trailing12MonthsRaw: number;
    peakMonthLabel: string;
    peakMonthIndex: number;
    strongestYear: number | null;
    latestMonthAnomalyPct: number | null;
  };
  monthlyBaseline: Array<{
    month: number;
    label: string;
    meanHarmonizedIndex: number;
    meanRawTotal: number;
  }>;
  cells: CalendarMonthCell[];
}

export const SATELLITE_FEEDS: FirmsSourceMeta[] = [
  {
    id: 'VIIRS_NOAA20_NRT',
    label: 'VIIRS NOAA-20 (JPSS-1)',
    shortLabel: 'NOAA-20',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'circle',
    color: '#FB923C', // Tangerine
    description: 'Joint Polar Satellite System-1 (NOAA-20) 375m active fire detections.',
    plainSummary:
      'Orbits pole-to-pole ~14 times every day with a high-detail 375m heat camera sharp enough to spot small brush fires and campfires.',
    funFact:
      'Crosses the equator around 1:30 PM local time every day, catching wildfires near peak afternoon heat.',
    image: satNoaa20Img,
  },
  {
    id: 'VIIRS_NOAA21_NRT',
    label: 'VIIRS NOAA-21 (JPSS-2)',
    shortLabel: 'NOAA-21',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'diamond',
    color: '#FACC15', // Bright Yellow
    description: 'Joint Polar Satellite System-2 (NOAA-21) 375m active fire detections.',
    plainSummary:
      'NOAA’s newest polar weather & fire satellite, flying 50 minutes ahead of NOAA-20 so fast-moving fires are scanned twice as often.',
    funFact:
      'Its VIIRS sensor scans Earth in 22 infrared and visible light bands—seeing heat signatures straight through thick smoke.',
    image: satNoaa21Img,
  },
  {
    id: 'VIIRS_SNPP_NRT',
    label: 'VIIRS Suomi-NPP',
    shortLabel: 'S-NPP',
    instrument: 'VIIRS',
    resolution: '375 m',
    shape: 'triangle',
    color: '#F97316', // Orange
    description: 'Suomi National Polar-orbiting Partnership 375m active fire detections.',
    plainSummary:
      'NASA & NOAA’s 2011 pathfinder spacecraft bridging older climate satellites and today’s high-resolution wildfire alert network.',
    funFact:
      'Named after weather-satellite pioneer Verner Suomi; its night sensor can spot glowing firelines even under moonlight.',
    image: satSuomiNppImg,
  },
  {
    id: 'MODIS_NRT',
    label: 'MODIS Terra & Aqua',
    shortLabel: 'MODIS',
    instrument: 'MODIS',
    resolution: '1 km',
    shape: 'square',
    color: '#BEF264', // Lemon-Olive highlight
    description: 'Collection 6.1 1km morning (Terra) & afternoon (Aqua) global fire detections.',
    plainSummary:
      'A twin-satellite NASA system (Terra scans in the morning, Aqua in the afternoon) surveying broad wildfire fronts in 1 km grid squares.',
    funFact:
      'Operating since 1999 & 2002, Terra and Aqua hold the longest continuous daily fire dataset in modern Earth science.',
    image: satModisImg,
  },
];
