import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { useFirmsData } from '../context/FirmsDataContext';
import {
  ConfidenceFilter,
  DayNightFilter,
  SATELLITE_FEEDS,
} from '../types/firms';
import { FeedShapeIcon } from '../components/FeedShapeIcon';
import { getCountryList } from '../utils/countryAtlas';

const PAGE_SIZE = 25;

export function ActivityPage() {
  const {
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
    setDays,
    setSelectedDate,
    jumpOneYearAgo,
    setHarmonizedMode,
    setConfidence,
    setDaynight,
    setSelectedCountry,
    toggleSource,
    selectAllSources,
    resetAllFilters,
    refreshData,
    downloadFilteredCsv,
  } = useFirmsData();

  const navigate = useNavigate();
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const countryList = useMemo(() => getCountryList(), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute live Radiative Power severity buckets from real points (Palette #4720)
  const frpBuckets = useMemo(() => {
    const pts = data?.points ?? [];
    const buckets = [
      { label: '< 10 MW', sub: 'Smoldering / small brush', count: 0, color: '#6F7739' },
      { label: '10 – 50 MW', sub: 'Moderate active front', count: 0, color: '#EAB308' },
      { label: '50 – 200 MW', sub: 'High-intensity blaze', count: 0, color: '#FB923C' },
      { label: '200+ MW', sub: 'Extreme crown / megafire', count: 0, color: '#F97316' },
    ];
    for (let i = 0; i < pts.length; i++) {
      const frp = pts[i][3];
      if (frp < 10) buckets[0].count++;
      else if (frp < 50) buckets[1].count++;
      else if (frp < 200) buckets[2].count++;
      else buckets[3].count++;
    }
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, maxCount };
  }, [data?.points]);

  const tableRows = data?.tableRows ?? [];
  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = tableRows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const series = data?.dailySeries ?? [];
  const maxDetections = Math.max(1, ...series.map((s) => s.detections));
  const maxMeanFrp = Math.max(5, ...series.map((s) => s.meanFrp));
  const hoveredPoint =
    hoveredBarIdx !== null && series[hoveredBarIdx] ? series[hoveredBarIdx] : null;

  const formatConfidence = (tier: 'h' | 'n' | 'l', raw: string) => {
    if (tier === 'h') return { label: `High (${raw})`, cls: 'text-tangerine font-semibold' };
    if (tier === 'n') return { label: `Nominal (${raw})`, cls: 'text-lemon font-medium' };
    return { label: `Low (${raw})`, cls: 'text-cream/60' };
  };

  return (
    <section className="relative z-10 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-olive/35 pb-5">
          <div>
            <p className="text-xs font-medium text-lemon">
              Thermal Telemetry Ledger ·{' '}
              {selectedDate
                ? `Historical NASA FIRMS (${selectedDate})`
                : 'Live NASA FIRMS & Server Archive'}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              Fire Activity &amp; Intensity Analysis
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-olive/40 bg-void p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHarmonizedMode(true)}
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  harmonizedMode
                    ? 'bg-forest-dark text-bright-yellow'
                    : 'text-cream/70 hover:text-cream'
                }`}
              >
                Harmonized View
              </button>
              <button
                type="button"
                onClick={() => setHarmonizedMode(false)}
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  !harmonizedMode
                    ? 'bg-tangerine text-void font-bold'
                    : 'text-cream/70 hover:text-cream'
                }`}
              >
                Sensor Breakdown
              </button>
            </div>

            <button
              type="button"
              onClick={downloadFilteredCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-olive/45 bg-chocolate/90 px-4 py-2 text-xs font-semibold text-cream hover:border-bright-yellow hover:bg-bright-yellow hover:text-void transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export Filtered CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Workbench */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive/25 pb-4">
            <h2 className="text-base font-semibold text-cream">
              Territory, Historical Date &amp; Satellite Filters
            </h2>
            <button
              type="button"
              onClick={() => {
                resetAllFilters();
                setPage(0);
              }}
              className="inline-flex items-center gap-1.5 rounded border border-olive/40 bg-chocolate px-2.5 py-1 text-xs font-semibold text-cream hover:border-bright-yellow hover:text-bright-yellow transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <label
                htmlFor="activity-country-select"
                className="block text-xs font-semibold text-cream/80"
              >
                Territory / Custom Box
              </label>
              <select
                id="activity-country-select"
                value={selectedCountry?.isCustom ? '__custom__' : selectedCountry?.id ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__custom__') return;
                  const picked = countryList.find((c) => c.id === e.target.value) ?? null;
                  setSelectedCountry(picked);
                  setPage(0);
                }}
                className="mt-1.5 w-full rounded-lg border border-olive/40 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
              >
                <option value="">Global (All Countries)</option>
                {selectedCountry?.isCustom && (
                  <option value="__custom__">{selectedCountry.name}</option>
                )}
                {countryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-4">
              <label
                htmlFor="activity-date-input"
                className="block text-xs font-semibold text-cream/80"
              >
                Historical Date (2000–Present)
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-olive/40 bg-void px-2.5 py-1.5">
                <input
                  id="activity-date-input"
                  type="date"
                  min="2000-11-01"
                  max={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(0);
                  }}
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-cream focus:outline-none [color-scheme:dark]"
                />
                <button
                  type="button"
                  onClick={() => {
                    jumpOneYearAgo();
                    setPage(0);
                  }}
                  className="rounded border border-olive/45 bg-chocolate px-1.5 py-0.5 text-[10px] font-bold text-lemon hover:border-bright-yellow hover:text-bright-yellow cursor-pointer whitespace-nowrap"
                >
                  1 Yr Ago
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('');
                      setPage(0);
                    }}
                    className="rounded bg-tangerine px-1.5 py-0.5 text-[10px] font-bold text-void hover:bg-bright-yellow cursor-pointer"
                  >
                    Live
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <span className="block text-xs font-semibold text-cream/80">
                Lookback Span
              </span>
              <div className="mt-1.5 grid grid-cols-6 gap-1 rounded-lg bg-void p-1">
                {[
                  { d: 1, label: '1d' },
                  { d: 3, label: '3d' },
                  { d: 5, label: '5d' },
                  { d: 30, label: '30d' },
                  { d: 90, label: '90d' },
                  { d: 365, label: '1Y' },
                ].map((opt) => (
                  <button
                    key={opt.d}
                    type="button"
                    onClick={() => {
                      setDays(opt.d);
                      setPage(0);
                    }}
                    className={`rounded-md py-1.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                      days === opt.d && !selectedDate
                        ? 'bg-forest-dark text-bright-yellow border border-forest-muted/60'
                        : 'text-cream/65 hover:text-cream'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <span className="block text-xs font-semibold text-cream/80">
                Confidence
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-void p-1">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'nominal_plus', label: 'Nom+' },
                    { key: 'high', label: 'High' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setConfidence(item.key as ConfidenceFilter);
                      setPage(0);
                    }}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      confidence === item.key
                        ? 'bg-tangerine text-void font-bold'
                        : 'text-cream/65 hover:text-cream'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <span className="block text-xs font-semibold text-cream/80">
                Overpass
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-void p-1">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'D', label: 'Day' },
                    { key: 'N', label: 'Night' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setDaynight(item.key as DayNightFilter);
                      setPage(0);
                    }}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      daynight === item.key
                        ? 'bg-bright-yellow text-void font-bold'
                        : 'text-cream/65 hover:text-cream'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-olive/30 pt-4">
            <span className="mr-1 text-xs font-semibold text-cream/80">Feeds:</span>
            {SATELLITE_FEEDS.map((feed) => {
              const active = selectedSources.includes(feed.id);
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() => {
                    toggleSource(feed.id);
                    setPage(0);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-olive/60 bg-chocolate text-cream'
                      : 'border-olive/20 bg-void/60 text-cream/40'
                  }`}
                >
                  <FeedShapeIcon shape={feed.shape} color={feed.color} size={12} />
                  <span>{feed.shortLabel}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                selectAllSources();
                setPage(0);
              }}
              className="ml-auto text-xs font-semibold text-tangerine hover:text-bright-yellow hover:underline cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-ember/60 bg-chocolate/90 px-5 py-4 text-xs text-cream">
            <span>NASA FIRMS Error: {error}</span>
            <button
              type="button"
              onClick={refreshData}
              className="rounded border border-bright-yellow bg-charcoal px-3 py-1 font-semibold text-bright-yellow hover:bg-bright-yellow hover:text-void transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Unified Telemetry Ledger Band */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md">
          <div className="grid grid-cols-2 divide-y divide-olive/25 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="text-xs text-cream/65">
                {harmonizedMode ? 'Harmonized Fire Index' : 'Raw Pixel Detections'}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-bright-yellow tabular-nums">
                {loading
                  ? '...'
                  : harmonizedMode
                  ? (data?.summary.harmonizedIndex ?? 0).toLocaleString()
                  : (data?.summary.totalDetections ?? 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-cream/65">
                {harmonizedMode
                  ? `${(data?.summary.fireEventClusters ?? 0).toLocaleString()} ~5km clusters (${(data?.summary.totalDetections ?? 0).toLocaleString()} raw)`
                  : selectedCountry
                  ? selectedCountry.name
                  : 'Global scope'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-cream/65">Peak Radiative Power</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-tangerine tabular-nums">
                {loading ? '—' : data?.summary.peakFrp.toFixed(1)}{' '}
                <span className="text-xs font-normal text-cream/60">MW</span>
              </p>
              <p className="mt-0.5 text-xs text-cream/65">
                Mean {loading ? '—' : data?.summary.meanFrp.toFixed(2)} MW · Total{' '}
                {loading ? '—' : (data?.summary.totalFrpMw ?? 0).toLocaleString()} MW
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-cream/65">Mean Brightness (Ti4)</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-lemon tabular-nums">
                {loading ? '—' : data?.summary.meanBrightTi4.toFixed(1)}{' '}
                <span className="text-xs font-normal text-cream/60">K</span>
              </p>
              <p className="mt-0.5 text-xs text-cream/65">
                VIIRS→MODIS scale: {data?.summary.viirsToModisScale ?? '0.28'}x
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-cream/65">Day / Night Split</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-cream tabular-nums">
                {loading
                  ? '—'
                  : `${data?.summary.dayCount.toLocaleString() ?? 0}D / ${
                      data?.summary.nightCount.toLocaleString() ?? 0
                    }N`}
              </p>
              <p className="mt-0.5 text-xs text-cream/65">UTC orbital pass</p>
            </div>
          </div>
        </div>

        {/* Empty State vs Rich Visual Analytics */}
        {!loading && data && data.summary.totalDetections === 0 ? (
          <div className="rounded-xl border border-dashed border-olive/45 bg-charcoal/85 px-6 py-12 text-center backdrop-blur-md">
            <Flame className="mx-auto h-8 w-8 text-tangerine" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-semibold text-cream">
              Zero real detections match these filters
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-cream/70">
              Try expanding your day span, clearing the date or country filter, or enabling all
              satellite feeds.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-tangerine px-4 py-2 text-xs font-bold text-void hover:bg-bright-yellow transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <>
            {/* 3-Panel Telemetry Analytics Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* FRP Severity Distribution */}
              <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md p-5 sm:p-6 lg:col-span-4">
                <h3 className="font-display text-lg font-semibold text-cream">
                  How Strong Are the Fires? (FRP)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-cream/70">
                  <strong className="text-lemon">FRP</strong> stands for{' '}
                  <em>Fire Radiative Power</em> — how much heat a fire gives off per second in{' '}
                  <strong className="text-cream">Megawatts (MW)</strong>. Higher MW means a hotter,
                  stronger fire.
                </p>

                <div className="mt-5 space-y-3.5">
                  {frpBuckets.buckets.map((bucket) => {
                    const pct = (bucket.count / frpBuckets.maxCount) * 100;
                    return (
                      <div key={bucket.label} className="space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <div>
                            <span className="font-mono font-semibold text-cream">
                              {bucket.label}
                            </span>
                            <span className="ml-2 text-[11px] text-cream/60">
                              {bucket.sub}
                            </span>
                          </div>
                          <span className="font-mono font-semibold text-bright-yellow tabular-nums">
                            {bucket.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-void">
                          <div
                            className="h-full transition-all duration-200"
                            style={{
                              width: `${Math.max(bucket.count > 0 ? 3 : 0, pct)}%`,
                              backgroundColor: bucket.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Detections & Mean FRP Chart */}
              <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md p-5 sm:p-6 lg:col-span-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-cream">
                      Daily Fire Count vs. Strength
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-cream/70">
                      <span className="font-semibold text-lemon">Green bars</span> = how many fires
                      were seen each day.{' '}
                      <span className="font-semibold text-tangerine">Orange line</span> = average
                      fire heat strength (MW). Hover a bar for exact numbers.
                    </p>
                  </div>
                  {hoveredPoint && (
                    <div className="shrink-0 rounded border border-olive/40 bg-void/90 px-2 py-1 text-right font-mono text-[11px] tabular-nums">
                      <div className="font-semibold text-bright-yellow">{hoveredPoint.date}</div>
                      <div className="text-cream">
                        {hoveredPoint.detections.toLocaleString()} spots
                      </div>
                      <div className="text-tangerine">{hoveredPoint.meanFrp} MW avg</div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <svg viewBox="0 0 420 200" className="w-full overflow-visible">
                    {[0, 0.5, 1].map((step) => {
                      const y = 165 - step * 130;
                      return (
                        <line
                          key={step}
                          x1="28"
                          y1={y}
                          x2="404"
                          y2={y}
                          stroke="#F5F0E0"
                          strokeOpacity="0.14"
                          strokeDasharray="3 3"
                        />
                      );
                    })}

                    {series.slice(-14).map((point, idx, arr) => {
                      const slotWidth = 368 / Math.max(arr.length, 1);
                      const barWidth = Math.min(36, Math.max(10, slotWidth * 0.55));
                      const xCenter = 32 + idx * slotWidth + slotWidth / 2;
                      const barHeight = Math.max(8, (point.detections / maxDetections) * 120);
                      const yTop = 165 - barHeight;
                      return (
                        <g
                          key={point.date}
                          onMouseEnter={() => setHoveredBarIdx(idx)}
                          onMouseLeave={() => setHoveredBarIdx(null)}
                          className="cursor-crosshair"
                        >
                          <rect
                            x={xCenter - barWidth / 2}
                            y={yTop}
                            width={barWidth}
                            height={barHeight}
                            rx="3"
                            fill={hoveredBarIdx === idx ? '#FACC15' : '#4B6542'}
                          />
                          <text
                            x={xCenter}
                            y="186"
                            textAnchor="middle"
                            fontSize="9.5"
                            fontFamily="JetBrains Mono, monospace"
                            fill="#F5F0E0"
                            fillOpacity="0.65"
                          >
                            {point.label}
                          </text>
                        </g>
                      );
                    })}

                    {series.slice(-14).length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#FB923C"
                        strokeWidth="2.4"
                        points={series
                          .slice(-14)
                          .map((point, idx, arr) => {
                            const slotWidth = 368 / Math.max(arr.length, 1);
                            const xCenter = 32 + idx * slotWidth + slotWidth / 2;
                            const yFrp = 165 - (point.meanFrp / maxMeanFrp) * 120;
                            return `${xCenter},${yFrp}`;
                          })
                          .join(' ')}
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Constellation Breakdown */}
              <div className="rounded-xl border border-olive/35 bg-charcoal/85 backdrop-blur-md p-5 sm:p-6 lg:col-span-4">
                <h3 className="font-display text-lg font-semibold text-cream">
                  Which Satellite Spotted What?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-cream/70">
                  Share of matching fire spots detected by each orbiting satellite constellation.
                </p>

                <div className="mt-5 space-y-3.5">
                  {(data?.bySource ?? []).map((feed) => {
                    const total = data?.summary.totalDetections || 1;
                    const pct = (feed.count / total) * 100;
                    return (
                      <div key={feed.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-semibold text-cream">
                            <FeedShapeIcon shape={feed.shape} color={feed.color} size={12} />
                            <span>{feed.shortLabel}</span>
                          </div>
                          <span className="font-mono text-cream/80 tabular-nums">
                            {feed.count.toLocaleString()} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-void">
                          <div
                            className="h-full transition-all duration-200"
                            style={{
                              width: `${Math.max(feed.count > 0 ? 3 : 0, pct)}%`,
                              backgroundColor: feed.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live NASA FIRMS Detection Ledger */}
            <div className="rounded-xl border border-olive/35 bg-charcoal/90 backdrop-blur-md overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive/30 bg-chocolate/80 px-5 py-3.5">
                <div>
                  <h3 className="font-display text-lg font-semibold text-cream">
                    Fire Detection Log
                  </h3>
                  <p className="text-xs text-cream/65">
                    Every row is one real heat detection from NASA FIRMS. Click Locate to zoom right
                    to that spot on satellite imagery.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-olive/40 bg-charcoal text-cream hover:border-bright-yellow disabled:opacity-35 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-cream/85">
                    Page {safePage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-olive/40 bg-charcoal text-cream hover:border-bright-yellow disabled:opacity-35 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-olive/25 bg-void/70 text-lemon/80">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Location (Lat, Lon)</th>
                      <th className="px-3 py-2.5 font-semibold">Seen At (UTC)</th>
                      <th className="px-3 py-2.5 font-semibold">Satellite &amp; Shape</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Heat Temp (K)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Fire Power (MW)</th>
                      <th className="px-3 py-2.5 font-semibold">Certainty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive/20">
                    {pageRows.map((row, idx) => {
                      const feed = SATELLITE_FEEDS[row.sourceIdx] ?? SATELLITE_FEEDS[0];
                      const confInfo = formatConfidence(row.confidenceTier, row.confidenceRaw);
                      return (
                        <tr
                          key={`${row.source}-${row.lat}-${row.lon}-${row.acqTime}-${idx}`}
                          className="hover:bg-chocolate/60 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-mono text-cream tabular-nums whitespace-nowrap">
                            {row.lat.toFixed(4)}, {row.lon.toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-cream/75 tabular-nums whitespace-nowrap">
                            {row.acqDate} {row.acqTime} · {row.daynight}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 font-medium text-cream">
                              <FeedShapeIcon shape={feed.shape} color={feed.color} size={11} />
                              <span>
                                {feed.shortLabel} ({row.satellite})
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-cream tabular-nums">
                            {row.brightTi4.toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-tangerine tabular-nums">
                            {row.frp.toFixed(2)}
                          </td>
                          <td className={`px-3 py-2.5 whitespace-nowrap ${confInfo.cls}`}>
                            {confInfo.label}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate(`/map?lat=${row.lat}&lon=${row.lon}`)}
                              className="inline-flex items-center gap-1 font-semibold text-lemon hover:text-bright-yellow cursor-pointer"
                            >
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              <span>Locate</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
