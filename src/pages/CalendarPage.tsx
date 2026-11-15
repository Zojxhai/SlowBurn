import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Download,
  ExternalLink,
  Flame,
  Palette,
  RefreshCw,
} from 'lucide-react';
import { useFirmsData } from '../context/FirmsDataContext';
import { CalendarMonthCell, ConfidenceFilter } from '../types/firms';
import { getCountryList } from '../utils/countryAtlas';

type MetricMode = 'harmonized' | 'clusters' | 'raw';
type ColorRamp = 'ember' | 'viridis';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getRampColor(ratio: number, hasData: boolean, ramp: ColorRamp): { bg: string; text: string } {
  if (!hasData) {
    return { bg: 'rgba(13, 12, 9, 0.55)', text: 'rgba(245, 240, 224, 0.32)' };
  }
  if (ratio <= 0) {
    return { bg: 'rgba(32, 30, 23, 0.85)', text: 'rgba(245, 240, 224, 0.55)' };
  }

  if (ramp === 'viridis') {
    // Accessible colorblind-safe Viridis-inspired ramp (high legibility on dark canvas)
    if (ratio < 0.2) return { bg: '#2C3E50', text: '#F5F0E0' };
    if (ratio < 0.4) return { bg: '#2A788E', text: '#F5F0E0' };
    if (ratio < 0.65) return { bg: '#35B779', text: '#0D0C09' };
    if (ratio < 0.85) return { bg: '#AADC32', text: '#0D0C09' };
    return { bg: '#FDE725', text: '#0D0C09' };
  }

  // SlowBurn Ember ramp (Palette #4720: forest-dark -> olive -> bright-yellow -> tangerine -> orange)
  if (ratio < 0.18) return { bg: '#253322', text: '#F5F0E0' };
  if (ratio < 0.38) return { bg: '#6F7739', text: '#F5F0E0' };
  if (ratio < 0.62) return { bg: '#EAB308', text: '#0D0C09' };
  if (ratio < 0.84) return { bg: '#FB923C', text: '#0D0C09' };
  return { bg: '#F97316', text: '#0D0C09' };
}

export function CalendarPage() {
  const {
    selectedCountry,
    setSelectedCountry,
    setCustomBounds,
    confidence,
    setConfidence,
    selectHistoricalWindow,
    calendarData,
    calendarLoading,
    calendarError,
    fetchCalendarData,
    downloadCalendarCsv,
  } = useFirmsData();

  const navigate = useNavigate();
  const countryList = useMemo(() => getCountryList(), []);

  const [metricMode, setMetricMode] = useState<MetricMode>('harmonized');
  const [colorRamp, setColorRamp] = useState<ColorRamp>('ember');
  const [selectedCell, setSelectedCell] = useState<CalendarMonthCell | null>(null);

  // Trigger calendar load on mount and when country/confidence changes
  useEffect(() => {
    fetchCalendarData();
  }, [selectedCountry, confidence, fetchCalendarData]);

  const cellMap = useMemo(() => {
    const map = new Map<string, CalendarMonthCell>();
    for (const c of calendarData?.cells ?? []) {
      map.set(`${c.year}-${c.month}`, c);
    }
    return map;
  }, [calendarData]);

  const yearsDesc = useMemo(() => {
    return [...(calendarData?.meta.yearsCovered ?? [])].sort((a, b) => b - a);
  }, [calendarData]);

  const getCellValue = (c: CalendarMonthCell): number => {
    if (metricMode === 'clusters') return c.clusteredEvents;
    if (metricMode === 'raw') return c.rawTotal;
    return c.harmonizedIndex;
  };

  const maxCellValue = useMemo(() => {
    let max = 1;
    for (const c of calendarData?.cells ?? []) {
      const val = getCellValue(c);
      if (val > max) max = val;
    }
    return max;
  }, [calendarData, metricMode]);

  const maxBaselineMean = useMemo(() => {
    let max = 1;
    for (const m of calendarData?.monthlyBaseline ?? []) {
      if (m.meanHarmonizedIndex > max) max = m.meanHarmonizedIndex;
    }
    return max;
  }, [calendarData]);

  // Select the most recent non-empty cell automatically when calendar loads
  useEffect(() => {
    const cells = calendarData?.cells ?? [];
    if (cells.length === 0) {
      setSelectedCell(null);
      return;
    }
    const nonZero = [...cells].reverse().find((c) => c.harmonizedIndex > 0);
    setSelectedCell(nonZero ?? cells[cells.length - 1]);
  }, [calendarData]);

  const handleInspectOnMap = (cell: CalendarMonthCell) => {
    setSelectedCell(cell);
    const nowYm = new Date().toISOString().slice(0, 7);
    const targetDate = cell.ym === nowYm ? '' : `${cell.ym}-15`;
    const spanDays = 5;
    selectHistoricalWindow(targetDate, spanDays);

    const params = new URLSearchParams();
    params.set('ym', cell.ym);
    if (targetDate) {
      params.set('date', targetDate);
    }
    params.set('days', String(spanDays));

    if (selectedCountry && !selectedCountry.isCustom) {
      params.set('country', selectedCountry.id);
    } else {
      const activeBbox = selectedCountry?.bbox ?? calendarData?.meta.bbox ?? [-125, 31, -112, 43];
      const activeName =
        selectedCountry?.name ??
        calendarData?.meta.regionName ??
        'Western North America (Calendar Region)';
      if (!selectedCountry) {
        setCustomBounds(activeName, activeBbox);
      }
      params.set('bbox', activeBbox.map((n) => n.toFixed(3)).join(','));
      params.set('region', activeName);
    }

    navigate(`/map?${params.toString()}`);
  };

  return (
    <section className="relative z-10 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-olive/35 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium text-lemon">
<<<<<<< HEAD
              MODIS + VIIRS Harmonized Time Series · Trailing 1-Year Fire Climatology
=======
              MODIS (2000–Present) + VIIRS Harmonized Time Series · Multi-Year Fire Climatology
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              Burning Activity Calendar
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-cream/75">
<<<<<<< HEAD
              Compare trailing 12-month wildfire activity across MODIS and VIIRS—with sensor
              resolution bias normalized and monthly anomalies tracked.
=======
              Compare trailing 12-month wildfire seasons against historical MODIS benchmarks since
              the early 2000s—with sensor resolution bias normalized and monthly anomalies tracked.
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCalendarCsv('summary')}
              disabled={!calendarData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-olive/45 bg-chocolate/90 px-3 py-2 text-xs font-semibold text-cream hover:border-bright-yellow hover:text-bright-yellow disabled:opacity-45 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Calendar Summary CSV</span>
            </button>
            <button
              type="button"
              onClick={() => downloadCalendarCsv('hotspots')}
              disabled={!calendarData}
              className="inline-flex items-center gap-1.5 rounded-lg bg-tangerine px-3.5 py-2 text-xs font-bold text-void hover:bg-bright-yellow disabled:opacity-45 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hotspots CSV</span>
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/88 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Calendar territory filter"
                value={selectedCountry?.isCustom ? '__custom__' : selectedCountry?.id ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__custom__') return;
                  const picked = countryList.find((c) => c.id === e.target.value) ?? null;
                  setSelectedCountry(picked);
                }}
                className="rounded-lg border border-olive/45 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
              >
                <option value="">Default Sampled Region (Western N. America)</option>
                {selectedCountry?.isCustom && (
                  <option value="__custom__">{selectedCountry.name}</option>
                )}
                {countryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Calendar confidence filter"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceFilter)}
                className="rounded-lg border border-olive/45 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
              >
                <option value="all">All Confidence</option>
                <option value="nominal_plus">Nominal &amp; High</option>
                <option value="high">High Only</option>
              </select>

              <button
                type="button"
                onClick={fetchCalendarData}
                disabled={calendarLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-olive/45 bg-chocolate px-3 py-2 text-xs font-semibold text-lemon hover:border-bright-yellow disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${calendarLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{calendarLoading ? 'Syncing Archive...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Harmonized vs Cluster vs Raw Metric */}
              <div className="inline-flex rounded-lg border border-olive/40 bg-void p-0.5 text-xs">
                {(
                  [
                    { key: 'harmonized', label: 'Harmonized Index' },
                    { key: 'clusters', label: '~5km Fire Events' },
                    { key: 'raw', label: 'Raw Pixels' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMetricMode(tab.key)}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                      metricMode === tab.key
                        ? 'bg-forest-dark text-bright-yellow'
                        : 'text-cream/65 hover:text-cream'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Accessible Color Ramp Switcher */}
              <button
                type="button"
                onClick={() => setColorRamp((r) => (r === 'ember' ? 'viridis' : 'ember'))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-olive/45 bg-chocolate px-3 py-1.5 text-xs font-semibold text-cream hover:border-bright-yellow cursor-pointer"
                title="Switch between SlowBurn Ember and Colorblind-Safe Viridis palette"
              >
                <Palette className="h-3.5 w-3.5 text-lemon" aria-hidden="true" />
                <span>{colorRamp === 'ember' ? 'Ramp: SlowBurn Ember' : 'Ramp: Viridis (CVD-Safe)'}</span>
              </button>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-cream/65">
            Active scope:{' '}
            <strong className="text-lemon">
              {calendarData?.meta.regionName ?? selectedCountry?.name ?? 'Western North America'}
            </strong>
            {calendarData && (
              <>
                {' '}
                · Empirical VIIRS→MODIS scale factor:{' '}
                <strong className="font-mono text-bright-yellow">
                  1 VIIRS ≈ {calendarData.meta.calibrationFactor} MODIS
                </strong>{' '}
<<<<<<< HEAD
                (trailing 12 months calibrated with MODIS + VIIRS)
=======
                (trailing 12 months calibrated with MODIS + VIIRS; historical benchmark years via
                MODIS _SP archive)
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
              </>
            )}
          </p>
        </div>

        {/* Error */}
        {calendarError && (
          <div className="flex items-center justify-between rounded-xl border border-ember/60 bg-chocolate/90 px-5 py-4 text-xs text-cream">
            <span>Calendar Error: {calendarError}</span>
            <button
              type="button"
              onClick={fetchCalendarData}
              className="rounded border border-bright-yellow bg-charcoal px-3 py-1 font-semibold text-bright-yellow cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Ledger */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md">
          <div className="grid grid-cols-2 divide-y divide-olive/25 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="text-xs text-cream/65">1-Year Harmonized Total</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-bright-yellow tabular-nums">
                {calendarLoading
                  ? '...'
                  : (calendarData?.summary.trailing12MonthsHarmonized ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-cream/60 tabular-nums">
                {(calendarData?.summary.trailing12MonthsRaw ?? 0).toLocaleString()} raw detections
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-cream/65">Historical Peak Month</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-tangerine tabular-nums">
                {calendarLoading ? '—' : calendarData?.summary.peakMonthLabel ?? '—'}
              </p>
<<<<<<< HEAD
              <p className="mt-0.5 text-[11px] text-cream/60">Highest in trailing 12 months</p>
=======
              <p className="mt-0.5 text-[11px] text-cream/60">Highest multi-year average</p>
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
            </div>

            <div className="p-5">
              <p className="text-xs text-cream/65">Most Active Year</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-lemon tabular-nums">
                {calendarLoading ? '—' : calendarData?.summary.strongestYear ?? '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-cream/60">
                Across {calendarData?.meta.yearsCovered.length ?? 0} tracked years
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-cream/65">Latest Month Anomaly</p>
              <p
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                  (calendarData?.summary.latestMonthAnomalyPct ?? 0) > 0
                    ? 'text-orange'
                    : 'text-lemon'
                }`}
              >
                {calendarLoading
                  ? '—'
                  : calendarData?.summary.latestMonthAnomalyPct === null ||
                    calendarData?.summary.latestMonthAnomalyPct === undefined
                  ? '0.0%'
                  : `${
                      calendarData.summary.latestMonthAnomalyPct > 0 ? '+' : ''
                    }${calendarData.summary.latestMonthAnomalyPct}%`}
              </p>
<<<<<<< HEAD
              <p className="mt-0.5 text-[11px] text-cream/60">vs 1-year monthly mean</p>
=======
              <p className="mt-0.5 text-[11px] text-cream/60">vs multi-year monthly mean</p>
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
            </div>
          </div>
        </div>

        {/* Year x Month Heatmap Grid */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/90 p-5 sm:p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive/25 pb-4">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-5 w-5 text-bright-yellow" aria-hidden="true" />
              <div>
                <h2 className="font-display text-lg font-semibold text-cream">
                  Year × Month Burning Activity Matrix
                </h2>
                <p className="text-xs text-cream/65">
                  Click any month cell to jump directly to that country, month, and year on the
                  satellite map.
                </p>
              </div>
            </div>

            {/* Color Scale Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-cream/75">
              <span>Quiet</span>
              {[0.1, 0.3, 0.5, 0.75, 0.95].map((r) => {
                const c = getRampColor(r, true, colorRamp);
                return (
                  <span
                    key={r}
                    className="h-3.5 w-6 rounded-sm border border-olive/30"
                    style={{ backgroundColor: c.bg }}
                  />
                );
              })}
              <span>Extreme</span>
            </div>
          </div>

          {calendarLoading ? (
            <div className="py-16 text-center text-sm text-lemon">
<<<<<<< HEAD
              Querying NASA FIRMS MODIS (_SP) &amp; VIIRS archives across the trailing 1-year
              window...
=======
              Querying NASA FIRMS MODIS (_SP) &amp; VIIRS archives across 1-year trace-back and
              historical baseline years...
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
            </div>
          ) : yearsDesc.length === 0 ? (
            <div className="py-14 text-center text-sm text-cream/70">
              <Flame className="mx-auto mb-2 h-7 w-7 text-tangerine" aria-hidden="true" />
<<<<<<< HEAD
              No 1-year calendar records found for this filter. Try selecting another country
=======
              No multi-year calendar records found for this filter. Try selecting another country
>>>>>>> 8371c220393af0227dd66a2db31c8b135a590de4
              or clearing confidence filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-separate border-spacing-1.5 text-xs">
                <thead>
                  <tr>
                    <th className="w-16 px-2 py-1 text-left font-mono text-lemon">Year</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-1 py-1 text-center font-mono font-semibold text-cream/80">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearsDesc.map((yr) => (
                    <tr key={yr}>
                      <td className="px-2 py-1 font-mono font-bold text-cream tabular-nums">
                        {yr}
                      </td>
                      {MONTHS.map((_, mIdx) => {
                        const cell = cellMap.get(`${yr}-${mIdx + 1}`);
                        const val = cell ? getCellValue(cell) : 0;
                        const ratio = cell ? val / maxCellValue : 0;
                        const { bg, text } = getRampColor(ratio, Boolean(cell), colorRamp);
                        const isSelected = selectedCell?.ym === cell?.ym;

                        return (
                          <td key={mIdx}>
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => handleInspectOnMap(cell)}
                                title={`Open ${cell.ym} on Satellite Map · ${cell.harmonizedIndex} harmonized · ${cell.clusteredEvents} clusters · ${cell.rawTotal} raw`}
                                className={`flex h-12 w-full flex-col items-center justify-center rounded-md border font-mono transition-transform hover:scale-[1.03] cursor-pointer ${
                                  isSelected
                                    ? 'border-bright-yellow ring-2 ring-bright-yellow/70'
                                    : 'border-olive/25'
                                }`}
                                style={{ backgroundColor: bg, color: text }}
                              >
                                <span className="text-[11px] font-bold tabular-nums leading-tight">
                                  {val.toLocaleString()}
                                </span>
                                {cell.anomalyPct !== null && val > 0 && (
                                  <span className="text-[9.5px] opacity-85 tabular-nums">
                                    {cell.anomalyPct > 0 ? `+${Math.round(cell.anomalyPct)}%` : `${Math.round(cell.anomalyPct)}%`}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div
                                className="flex h-12 w-full items-center justify-center rounded-md border border-olive/15 font-mono text-[10px]"
                                style={{ backgroundColor: bg, color: text }}
                              >
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Month Inspector + Multi-Year Monthly Climatology */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Inspector */}
          <div className="rounded-xl border border-olive/35 bg-charcoal/88 p-5 sm:p-6 lg:col-span-5 backdrop-blur-md">
            <h3 className="font-display text-lg font-semibold text-cream">
              Selected Month Breakdown
            </h3>
            {selectedCell ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between border-b border-olive/25 pb-3">
                  <div>
                    <p className="font-mono text-2xl font-bold text-bright-yellow">
                      {selectedCell.ym}
                    </p>
                    <p className="text-xs text-cream/65">
                      {selectedCell.sampleDays}-day representative window
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInspectOnMap(selectedCell)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-tangerine px-3.5 py-2 text-xs font-bold text-void hover:bg-bright-yellow transition-colors cursor-pointer"
                  >
                    <span>Open on Satellite Map</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-olive/25 bg-void/70 p-3">
                    <dt className="text-cream/65">Harmonized Index</dt>
                    <dd className="mt-1 font-mono text-lg font-bold text-bright-yellow tabular-nums">
                      {selectedCell.harmonizedIndex.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-olive/25 bg-void/70 p-3">
                    <dt className="text-cream/65">~5 km Fire Clusters</dt>
                    <dd className="mt-1 font-mono text-lg font-bold text-lemon tabular-nums">
                      {selectedCell.clusteredEvents.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-olive/25 bg-void/70 p-3">
                    <dt className="text-cream/65">Raw MODIS / VIIRS</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-cream tabular-nums">
                      {selectedCell.rawModis.toLocaleString()} M ·{' '}
                      {selectedCell.rawViirs.toLocaleString()} V
                    </dd>
                  </div>
                  <div className="rounded-lg border border-olive/25 bg-void/70 p-3">
                    <dt className="text-cream/65">Anomaly vs Mean</dt>
                    <dd
                      className={`mt-1 font-mono text-sm font-bold tabular-nums ${
                        (selectedCell.anomalyPct ?? 0) > 0 ? 'text-orange' : 'text-lemon'
                      }`}
                    >
                      {selectedCell.anomalyPct === null
                        ? 'Baseline'
                        : `${selectedCell.anomalyPct > 0 ? '+' : ''}${selectedCell.anomalyPct}%`}
                    </dd>
                  </div>
                </dl>

                <p className="font-mono text-[11px] text-cream/65 tabular-nums">
                  Cumulative Fire Radiative Power: {selectedCell.totalFrpMw.toLocaleString()} MW
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-cream/65">
                Select any month cell in the matrix to inspect harmonized vs raw counts and jump
                to that date on the map.
              </p>
            )}
          </div>

          {/* Monthly Seasonal Climatology Chart */}
          <div className="rounded-xl border border-olive/35 bg-charcoal/88 p-5 sm:p-6 lg:col-span-7 backdrop-blur-md">
            <h3 className="font-display text-lg font-semibold text-cream">
              Seasonal Climatology (Multi-Year Monthly Average)
            </h3>
            <p className="mt-1 text-xs text-cream/70">
              Average harmonized hotspots per month across all tracked years—highlighting when
              regional fire season peaks.
            </p>

            <div className="mt-5 grid grid-cols-12 items-end gap-2 h-44 border-b border-olive/30 pb-2">
              {(calendarData?.monthlyBaseline ?? []).map((b) => {
                const pct = (b.meanHarmonizedIndex / maxBaselineMean) * 100;
                const isPeak = calendarData?.summary.peakMonthIndex === b.month;
                return (
                  <div key={b.month} className="flex h-full flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-[10px] text-cream/75 tabular-nums">
                      {Math.round(b.meanHarmonizedIndex)}
                    </span>
                    <div
                      className="w-full rounded-t transition-all duration-200"
                      style={{
                        height: `${Math.max(b.meanHarmonizedIndex > 0 ? 6 : 2, pct * 0.78)}%`,
                        backgroundColor: isPeak ? '#F97316' : '#6F7739',
                      }}
                    />
                    <span
                      className={`font-mono text-[10.5px] ${
                        isPeak ? 'font-bold text-bright-yellow' : 'text-cream/70'
                      }`}
                    >
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
