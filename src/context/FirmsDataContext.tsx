import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  CalendarResponse,
  ConfidenceFilter,
  DayNightFilter,
  FirmsGlobalResponse,
  FirmsSourceId,
  SATELLITE_FEEDS,
  SelectedCountry,
<<<<<<< HEAD
=======
  ServerArchiveStatus,
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
} from '../types/firms';

interface FirmsDataContextValue {
  data: FirmsGlobalResponse | null;
  loading: boolean;
  error: string | null;
  selectedSources: FirmsSourceId[];
  days: number;
<<<<<<< HEAD
  selectedDate: string; // '' = latest NRT, or YYYY-MM-DD (up to 1 year ago to today)
=======
  selectedDate: string; // '' = latest NRT, or YYYY-MM-DD (2000-11-01 to today)
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
  harmonizedMode: boolean;
  confidence: ConfidenceFilter;
  daynight: DayNightFilter;
  selectedCountry: SelectedCountry | null;
<<<<<<< HEAD
=======
  serverArchive: ServerArchiveStatus | null;
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
  setDays: (days: number) => void;
  setSelectedDate: (date: string) => void;
  selectHistoricalWindow: (date: string, spanDays?: number) => void;
  jumpOneYearAgo: () => void;
  setHarmonizedMode: (val: boolean) => void;
  setConfidence: (conf: ConfidenceFilter) => void;
  setDaynight: (dn: DayNightFilter) => void;
  setSelectedCountry: (country: SelectedCountry | null) => void;
  setCustomBounds: (name: string, bbox: [number, number, number, number]) => void;
  toggleSource: (source: FirmsSourceId) => void;
  selectAllSources: () => void;
  selectSingleSource: (source: FirmsSourceId) => void;
  resetAllFilters: () => void;
  refreshData: () => void;
  buildExportCsvUrl: () => string;
  downloadFilteredCsv: () => void;
  // Burning Activity Calendar state
  calendarData: CalendarResponse | null;
  calendarLoading: boolean;
  calendarError: string | null;
  fetchCalendarData: () => void;
  downloadCalendarCsv: (format: 'summary' | 'hotspots') => void;
}

const ALL_SOURCES: FirmsSourceId[] = SATELLITE_FEEDS.map((f) => f.id);

const FirmsDataContext = createContext<FirmsDataContextValue | null>(null);

export function FirmsDataProvider({ children }: { children: ReactNode }) {
  const [selectedSources, setSelectedSources] = useState<FirmsSourceId[]>(ALL_SOURCES);
  const [days, setDays] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [harmonizedMode, setHarmonizedMode] = useState<boolean>(true);
  const [confidence, setConfidence] = useState<ConfidenceFilter>('all');
  const [daynight, setDaynight] = useState<DayNightFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);

  const [data, setData] = useState<FirmsGlobalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);
<<<<<<< HEAD
=======
  const [serverArchive, setServerArchive] = useState<ServerArchiveStatus | null>(null);
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4

  // Burning Activity Calendar state
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarTick, setCalendarTick] = useState<number>(0);

<<<<<<< HEAD
=======
  // Check shared background archive status on the server
  useEffect(() => {
    fetch('/api/firms/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s && typeof s.active === 'boolean') setServerArchive(s);
      })
      .catch(() => {});
  }, []);

>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('sources', selectedSources.join(','));
    params.set('days', String(days));
    if (selectedDate) {
      params.set('date', selectedDate);
    }
    params.set('confidence', confidence);
    params.set('daynight', daynight);
    if (selectedCountry) {
      params.set('bbox', selectedCountry.bbox.map((n) => n.toFixed(3)).join(','));
    }
    return params;
  }, [selectedSources, days, selectedDate, confidence, daynight, selectedCountry]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = buildQueryParams();
    const url = `/api/firms/global?${params.toString()}`;

    const retryDelays = [900, 1400, 1800, 2200, 2600];

    const fetchWithRetry = async (attempt: number): Promise<FirmsGlobalResponse> => {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        if (attempt < retryDelays.length) {
          await new Promise((r) => setTimeout(r, retryDelays[attempt]));
          return fetchWithRetry(attempt + 1);
        }
        throw new Error(
          'Live API proxy returned HTML instead of JSON. Please verify the SlowBurn server is running on port 3000.'
        );
      }

      const payload = await res.json();
      if (!res.ok) {
        if (res.status >= 502 && attempt < 2) {
          await new Promise((r) => setTimeout(r, retryDelays[attempt]));
          return fetchWithRetry(attempt + 1);
        }
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }
      return payload as FirmsGlobalResponse;
    };

    fetchWithRetry(0)
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Unable to load NASA FIRMS data');
        setLoading(false);
      });

    return () => controller.abort();
  }, [buildQueryParams, refreshTick]);

  // Calendar fetch trigger (only runs on demand when CalendarPage triggers fetchCalendarData)
  const buildCalendarParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCountry) {
      params.set('bbox', selectedCountry.bbox.map((n) => n.toFixed(3)).join(','));
      params.set('regionName', selectedCountry.name);
    } else {
      params.set('regionName', 'Western North America (Baseline Region)');
    }
    params.set('confidence', confidence);
    return params;
  }, [selectedCountry, confidence]);

  useEffect(() => {
    if (calendarTick === 0) return;
    const controller = new AbortController();
    setCalendarLoading(true);
    setCalendarError(null);

    const params = buildCalendarParams();
    fetch(`/api/firms/calendar?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Calendar API unavailable. Verify SlowBurn server is running.');
        }
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        return json as CalendarResponse;
      })
      .then((cal) => {
        setCalendarData(cal);
        setCalendarLoading(false);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setCalendarError(
          err instanceof Error ? err.message : 'Failed to build burning activity calendar'
        );
        setCalendarLoading(false);
      });

    return () => controller.abort();
  }, [buildCalendarParams, calendarTick]);

  const fetchCalendarData = useCallback(() => {
    setCalendarTick((t) => t + 1);
  }, []);

  const handleSetDays = useCallback((nextDays: number) => {
    setSelectedDate('');
    setDays(nextDays);
  }, []);

  const selectHistoricalWindow = useCallback((date: string, spanDays = 5) => {
    const clamped = Math.min(5, Math.max(1, Math.round(spanDays)));
    setDays(clamped);
    setSelectedDate(date);
  }, []);

  const jumpOneYearAgo = useCallback(() => {
    const d = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setDays(1);
    setSelectedDate(d);
  }, []);

  const setCustomBounds = useCallback(
    (name: string, bbox: [number, number, number, number]) => {
      setSelectedCountry({
        id: `custom:${bbox.map((n) => n.toFixed(2)).join(',')}`,
        name,
        bbox,
        isCustom: true,
      });
    },
    []
  );

  const toggleSource = (source: FirmsSourceId) => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== source);
      }
      return [...prev, source];
    });
  };

  const selectAllSources = () => setSelectedSources(ALL_SOURCES);
  const selectSingleSource = (source: FirmsSourceId) => setSelectedSources([source]);

  const resetAllFilters = () => {
    setSelectedSources(ALL_SOURCES);
    setDays(1);
    setSelectedDate('');
    setConfidence('all');
    setDaynight('all');
    setSelectedCountry(null);
  };

  const refreshData = () => setRefreshTick((t) => t + 1);

  const buildExportCsvUrl = () => {
    const params = buildQueryParams();
    return `/api/firms/export.csv?${params.toString()}`;
  };

  const downloadFilteredCsv = () => {
    const link = document.createElement('a');
    link.href = buildExportCsvUrl();
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCalendarCsv = (format: 'summary' | 'hotspots') => {
    const params = buildCalendarParams();
    params.set('format', format);
    const link = document.createElement('a');
    link.href = `/api/firms/calendar.csv?${params.toString()}`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <FirmsDataContext.Provider
      value={{
        data,
        loading,
        error,
        selectedSources,
        days,
        selectedDate,
        harmonizedMode,
        confidence,
        daynight,
        selectedCountry,
<<<<<<< HEAD
=======
        serverArchive,
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
        setDays: handleSetDays,
        setSelectedDate,
        selectHistoricalWindow,
        jumpOneYearAgo,
        setHarmonizedMode,
        setConfidence,
        setDaynight,
        setSelectedCountry,
        setCustomBounds,
        toggleSource,
        selectAllSources,
        selectSingleSource,
        resetAllFilters,
        refreshData,
        buildExportCsvUrl,
        downloadFilteredCsv,
        calendarData,
        calendarLoading,
        calendarError,
        fetchCalendarData,
        downloadCalendarCsv,
      }}
    >
      {children}
    </FirmsDataContext.Provider>
  );
}

export function useFirmsData() {
  const ctx = useContext(FirmsDataContext);
  if (!ctx) {
    throw new Error('useFirmsData must be used inside FirmsDataProvider');
  }
  return ctx;
}
