import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Compass, Download, RotateCcw } from 'lucide-react';
import { RealWorldFireMap } from '../components/RealWorldFireMap';
import { useFirmsData } from '../context/FirmsDataContext';
import { ConfidenceFilter, DayNightFilter } from '../types/firms';
import { getCountryList } from '../utils/countryAtlas';

export function GlobalMapPage() {
  const {
    selectedCountry,
    setSelectedCountry,
    setCustomBounds,
    selectedDate,
    setSelectedDate,
    selectHistoricalWindow,
    jumpOneYearAgo,
    confidence,
    setConfidence,
    daynight,
    setDaynight,
    resetAllFilters,
    downloadFilteredCsv,
  } = useFirmsData();

  const [searchParams] = useSearchParams();
  const appliedQueryRef = useRef<string>('');
  const countryList = useMemo(() => getCountryList(), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const oneYearAgoStr = useMemo(() => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs || appliedQueryRef.current === qs) return;

    const countryParam = searchParams.get('country');
    const bboxParam = searchParams.get('bbox');
    const regionParam = searchParams.get('region');
    const dateParam = searchParams.get('date');
    const daysParam = searchParams.get('days');

    if (!countryParam && !bboxParam && !dateParam && !daysParam) return;
    appliedQueryRef.current = qs;

    if (countryParam) {
      const matched = countryList.find((c) => c.id === countryParam);
      if (matched) setSelectedCountry(matched);
    } else if (bboxParam) {
      const parts = bboxParam.split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        setCustomBounds(
          regionParam || 'Calendar Region',
          parts as [number, number, number, number]
        );
      }
    }

    if (dateParam !== null || daysParam !== null) {
      const parsedDays = Number(daysParam ?? 5);
      selectHistoricalWindow(
        dateParam ?? '',
        Number.isNaN(parsedDays) ? 5 : parsedDays
      );
    }
  }, [searchParams, countryList, setSelectedCountry, setCustomBounds, selectHistoricalWindow]);

  const [showCoordPanel, setShowCoordPanel] = useState(false);
  const [westInput, setWestInput] = useState('-124');
  const [southInput, setSouthInput] = useState('32');
  const [eastInput, setEastInput] = useState('-114');
  const [northInput, setNorthInput] = useState('42');
  const [coordError, setCoordError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCountry) {
      setWestInput(selectedCountry.bbox[0].toFixed(2));
      setSouthInput(selectedCountry.bbox[1].toFixed(2));
      setEastInput(selectedCountry.bbox[2].toFixed(2));
      setNorthInput(selectedCountry.bbox[3].toFixed(2));
    }
  }, [selectedCountry]);

  const handleApplyCoords = (e: FormEvent) => {
    e.preventDefault();
    const w = Number(westInput);
    const s = Number(southInput);
    const ea = Number(eastInput);
    const n = Number(northInput);
    if (
      [w, s, ea, n].some((v) => Number.isNaN(v)) ||
      w < -180 ||
      ea > 180 ||
      w >= ea ||
      s < -85 ||
      n > 85 ||
      s >= n
    ) {
      setCoordError('Enter valid bounds: West < East (-180..180), South < North (-85..85).');
      return;
    }
    setCoordError(null);
    setCustomBounds(
      `Custom Bounds (${s.toFixed(1)}°..${n.toFixed(1)}°, ${w.toFixed(1)}°..${ea.toFixed(1)}°)`,
      [w, s, ea, n]
    );
    setShowCoordPanel(false);
  };

  return (
    <section className="relative z-10 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 border-b border-olive/35 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium text-lemon">
              SlowBurn Satellite Imagery · 1-Year Trace-Back &amp; Area Drawing
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              Live &amp; Historical Satellite Map
            </h1>
            <p className="mt-1.5 text-sm text-cream/75">
              Click any country, click <strong className="text-bright-yellow">Draw Area</strong> on
              the map, or enter custom coordinates &amp; explore up to 1 year of fire history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadFilteredCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-olive/45 bg-chocolate/90 px-3 py-2 text-xs font-semibold text-cream hover:border-bright-yellow hover:text-bright-yellow transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg bg-tangerine px-3.5 py-2 text-xs font-bold text-void hover:bg-bright-yellow transition-colors whitespace-nowrap"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <span>1-Yr Burn Calendar</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar: Country + Coordinates + Historical Date + Confidence + Day/Night */}
        <div className="rounded-xl border border-olive/35 bg-charcoal/85 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by country"
              value={selectedCountry?.isCustom ? '__custom__' : selectedCountry?.id ?? ''}
              onChange={(e) => {
                if (e.target.value === '__custom__') return;
                const picked = countryList.find((c) => c.id === e.target.value) ?? null;
                setSelectedCountry(picked);
              }}
              className="rounded-lg border border-olive/45 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
            >
              <option value="">All Countries (Global)</option>
              {selectedCountry?.isCustom && (
                <option value="__custom__">{selectedCountry.name}</option>
              )}
              {countryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowCoordPanel((s) => !s)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                showCoordPanel || selectedCountry?.isCustom
                  ? 'border-bright-yellow bg-forest-dark text-bright-yellow'
                  : 'border-olive/45 bg-chocolate/80 text-cream hover:border-lemon'
              }`}
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Lat / Lon Box</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-olive/45 bg-void px-2.5 py-1.5">
              <label htmlFor="map-date-picker" className="text-[11px] font-semibold text-lemon">
                Date:
              </label>
              <input
                id="map-date-picker"
                type="date"
                min={oneYearAgoStr}
                max={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-mono text-xs text-cream focus:outline-none [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={jumpOneYearAgo}
                className="rounded border border-olive/45 bg-chocolate px-2 py-0.5 text-[10px] font-bold text-lemon hover:border-bright-yellow hover:text-bright-yellow cursor-pointer whitespace-nowrap"
              >
                1 Year Ago
              </button>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="rounded bg-tangerine px-1.5 py-0.5 text-[10px] font-bold text-void hover:bg-bright-yellow cursor-pointer"
                >
                  Live
                </button>
              )}
            </div>

            <select
              aria-label="Filter by confidence"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as ConfidenceFilter)}
              className="rounded-lg border border-olive/45 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
            >
              <option value="all">All Confidence</option>
              <option value="nominal_plus">Nominal &amp; High</option>
              <option value="high">High Only</option>
            </select>

            <select
              aria-label="Filter by day or night pass"
              value={daynight}
              onChange={(e) => setDaynight(e.target.value as DayNightFilter)}
              className="rounded-lg border border-olive/45 bg-void px-3 py-2 text-xs font-semibold text-cream focus:border-bright-yellow focus:outline-none"
            >
              <option value="all">Day &amp; Night</option>
              <option value="D">Daytime (D)</option>
              <option value="N">Nocturnal (N)</option>
            </select>

            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-olive/45 bg-chocolate/90 px-3 py-2 text-xs font-semibold text-cream hover:border-bright-yellow hover:text-bright-yellow transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          {showCoordPanel && (
            <form
              onSubmit={handleApplyCoords}
              className="mt-3 flex flex-wrap items-end gap-3 border-t border-olive/25 pt-3 text-xs"
            >
              <div>
                <label className="block text-[11px] text-cream/70">West Lon (°)</label>
                <input
                  type="number"
                  step="0.1"
                  value={westInput}
                  onChange={(e) => setWestInput(e.target.value)}
                  className="mt-1 w-24 rounded border border-olive/45 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-cream/70">South Lat (°)</label>
                <input
                  type="number"
                  step="0.1"
                  value={southInput}
                  onChange={(e) => setSouthInput(e.target.value)}
                  className="mt-1 w-24 rounded border border-olive/45 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-cream/70">East Lon (°)</label>
                <input
                  type="number"
                  step="0.1"
                  value={eastInput}
                  onChange={(e) => setEastInput(e.target.value)}
                  className="mt-1 w-24 rounded border border-olive/45 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-cream/70">North Lat (°)</label>
                <input
                  type="number"
                  step="0.1"
                  value={northInput}
                  onChange={(e) => setNorthInput(e.target.value)}
                  className="mt-1 w-24 rounded border border-olive/45 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-bright-yellow px-4 py-1.5 font-bold text-void hover:bg-tangerine transition-colors cursor-pointer"
              >
                Apply Bounding Box
              </button>
              {coordError && <p className="text-xs text-tangerine">{coordError}</p>}
            </form>
          )}
        </div>

        <RealWorldFireMap />
      </div>
    </section>
  );
}
