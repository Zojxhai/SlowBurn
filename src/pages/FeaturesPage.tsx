import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Flame, MapPin, Radio, ShieldCheck } from 'lucide-react';
import { useFirmsData } from '../context/FirmsDataContext';
import orbitPatchworkImg from '../assets/images/patchwork_satellite_orbit_1794640077940.jpg';
import lookoutPatchworkImg from '../assets/images/patchwork_lookout_station_1794640078486.jpg';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function FeaturesPage() {
  const { data, buildExportCsvUrl } = useFirmsData();
  const navigate = useNavigate();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [frpThreshold, setFrpThreshold] = useState<'all' | 'moderate' | 'extreme'>('moderate');
  const [alertRadiusKm, setAlertRadiusKm] = useState<10 | 25 | 50>(25);

  // Real coordinates for Proximity Watchlist Scanner (defaults to strongest active fire or preset)
  const strongestHotspot = useMemo(() => {
    const pts = data?.points ?? [];
    if (pts.length === 0) return null;
    let best = pts[0];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][3] > best[3]) best = pts[i];
    }
    return best;
  }, [data?.points]);

  const [watchLat, setWatchLat] = useState<string>('34.0522');
  const [watchLon, setWatchLon] = useState<string>('-118.2437');
  const [hasCustomCoord, setHasCustomCoord] = useState(false);

  const effectiveLat = hasCustomCoord
    ? Number(watchLat)
    : strongestHotspot
    ? strongestHotspot[1]
    : 34.0522;
  const effectiveLon = hasCustomCoord
    ? Number(watchLon)
    : strongestHotspot
    ? strongestHotspot[0]
    : -118.2437;

  const proximityScan = useMemo(() => {
    const pts = data?.points ?? [];
    if (
      Number.isNaN(effectiveLat) ||
      Number.isNaN(effectiveLon) ||
      pts.length === 0
    ) {
      return { nearbyCount: 0, closestKm: null as number | null };
    }
    let nearbyCount = 0;
    let closestKm = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = haversineKm(effectiveLat, effectiveLon, pts[i][1], pts[i][0]);
      if (d <= alertRadiusKm) nearbyCount++;
      if (d < closestKm) closestKm = d;
    }
    return {
      nearbyCount,
      closestKm: closestKm < Infinity ? closestKm : null,
    };
  }, [data?.points, effectiveLat, effectiveLon, alertRadiusKm]);

  const markImgError = (key: string) =>
    setImgErrors((prev) => ({ ...prev, [key]: true }));

  const points = data?.points ?? [];
  const thresholdMin = frpThreshold === 'extreme' ? 50 : frpThreshold === 'moderate' ? 20 : 0;
  const thresholdMatches = points.filter((p) => p[3] >= thresholdMin).length;

  const sampleCsvPreview = [
    'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
    ...(data?.tableRows.slice(0, 3) ?? []).map(
      (r) =>
        `${r.lat},${r.lon},${r.brightTi4},${r.scan},${r.track},${r.acqDate},${r.acqTime},${r.satellite},${r.instrument},${r.confidenceRaw},${r.version},${r.brightTi5},${r.frp},${r.daynight}`
    ),
  ].join('\n');

  return (
    <section className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-olive/35 pb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-lemon">
              SlowBurn Guide · What Each Feature Does
            </p>
            <h1
              className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              Every tool in SlowBurn, explained in plain language.
            </h1>
          </div>

          <Link
            to="/map"
            className="rounded-lg bg-tangerine px-4 py-2.5 text-xs font-bold text-void hover:bg-bright-yellow transition-colors whitespace-nowrap"
          >
            Open Satellite Map
          </Link>
        </div>

        {/* 01. Multi-Sensor Patchwork Feature Monograph */}
        <article className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-olive/35 bg-charcoal/85 p-6 backdrop-blur-md lg:grid-cols-12 lg:p-8">
          <div className="space-y-4 lg:col-span-6">
            <p className="text-xs font-semibold text-tangerine">
              01. Four Satellites Working Together
            </p>
            <h2 className="font-display text-2xl font-semibold text-cream sm:text-3xl">
              Live heat specks from 4 different spacecraft
            </h2>
            <p className="text-sm leading-relaxed text-cream/80">
              SlowBurn combines live infrared feeds from <strong className="text-cream">NOAA-20</strong>,{' '}
              <strong className="text-cream">NOAA-21</strong>,{' '}
              <strong className="text-cream">Suomi-NPP</strong>, and{' '}
              <strong className="text-cream">MODIS (Terra &amp; Aqua)</strong> over real satellite
              terrain. Each satellite gets its own color and tiny shape so you can turn individual
              feeds on or off and see where different satellites spotted the same fire.
            </p>
            <div className="grid grid-cols-2 gap-6 border-t border-dashed border-olive/40 pt-4 text-xs">
              <div>
                <div className="font-mono text-lg font-semibold text-bright-yellow">375 m</div>
                <div className="text-cream/70">VIIRS sharpness (catches small fires)</div>
              </div>
              <div>
                <div className="font-mono text-lg font-semibold text-lemon">1 km</div>
                <div className="text-cream/70">MODIS wide sweep (long climate record)</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-dashed border-lemon/30 bg-chocolate/80 p-2">
              {!imgErrors.orbit ? (
                <div className="relative">
                  <img
                    src={orbitPatchworkImg}
                    alt="Artisanal stitched patchwork textile illustration of an orbital satellite sweeping amber beams over quilted forest valleys"
                    referrerPolicy="no-referrer"
                    onError={() => markImgError('orbit')}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <span className="absolute top-2.5 right-2.5 rounded border border-olive/50 bg-void/85 px-2 py-0.5 font-mono text-[10px] font-medium text-cream/90">
                    AI-Generated Image
                  </span>
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-void">
                  <Flame className="h-8 w-8 text-tangerine" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </article>

        {/* 02 & 05 Interactive Telemetry Pair */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 02. FRP Intensity Filter */}
          <article className="flex flex-col justify-between rounded-2xl border border-olive/35 bg-charcoal/85 p-6 backdrop-blur-md">
            <div>
              <p className="text-xs font-semibold text-tangerine">
                02. Fire Strength Filter (FRP / Megawatts)
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-cream">
                How strong is a fire burning?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream/80">
                <strong className="text-lemon">FRP (Fire Radiative Power)</strong> measures how much
                heat energy a fire radiates every second in <strong className="text-cream">Megawatts (MW)</strong>.
                Under 20 MW is usually small agricultural clearing or smoldering brush; 50+ MW indicates
                an intense, fast-spreading wildfire.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-olive/40 bg-chocolate/75 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-cream">
                <span>Active Spots Today Matching Filter</span>
                <span className="font-mono text-tangerine tabular-nums">
                  {thresholdMatches.toLocaleString()} spots
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-void p-1">
                {(
                  [
                    { key: 'all', label: 'All Fires' },
                    { key: 'moderate', label: '20+ MW' },
                    { key: 'extreme', label: '50+ MW' },
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setFrpThreshold(tier.key)}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      frpThreshold === tier.key
                        ? 'bg-tangerine text-void font-bold'
                        : 'text-cream/70 hover:text-cream'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-void">
                <div
                  className="h-full bg-bright-yellow transition-transform duration-200 origin-left"
                  style={{
                    transform: `scaleX(${
                      points.length > 0
                        ? Math.max(0.04, thresholdMatches / points.length)
                        : 0
                    })`,
                  }}
                />
              </div>
            </div>
          </article>

          {/* 05. Diurnal & Confidence Filtering */}
          <article className="flex flex-col justify-between rounded-2xl border border-olive/35 bg-charcoal/85 p-6 backdrop-blur-md">
            <div>
              <p className="text-xs font-semibold text-lemon">
                05. Day vs. Night &amp; Certainty Check
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-cream">
                Avoid false alarms from hot roofs or sun glare
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream/80">
                Satellites grade every spot as <strong className="text-cream">High (h)</strong>,{' '}
                <strong className="text-cream">Nominal (n)</strong>, or{' '}
                <strong className="text-cream">Low (l)</strong> confidence, and log whether it was seen
                during a <strong className="text-cream">Day (D)</strong> or{' '}
                <strong className="text-cream">Night (N)</strong> orbit—helping separate real wildfires
                from daytime metal-roof sun reflections.
              </p>
            </div>

            <div className="mt-6 space-y-3 rounded-xl border border-dashed border-olive/40 bg-chocolate/75 p-4 text-xs">
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="text-cream/70">Day vs. Night Detections</span>
                <span className="font-semibold text-bright-yellow">
                  {(data?.summary.dayCount ?? 0).toLocaleString()} Day ·{' '}
                  {(data?.summary.nightCount ?? 0).toLocaleString()} Night
                </span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="text-cream/70">Certainty (High / Nom / Low)</span>
                <span className="font-semibold text-lemon">
                  {(data?.summary.confidenceCounts.h ?? 0).toLocaleString()} /{' '}
                  {(data?.summary.confidenceCounts.n ?? 0).toLocaleString()} /{' '}
                  {(data?.summary.confidenceCounts.l ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 border-t border-olive/30 pt-2.5 text-cream/75">
                <ShieldCheck className="h-4 w-4 text-lemon shrink-0" aria-hidden="true" />
                <span>Filter by Confidence or Day/Night on Map &amp; Activity pages</span>
              </div>
            </div>
          </article>
        </div>

        {/* 03 & 04. Country Borders + Real Working Proximity Watchlist Buffer */}
        <article className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-olive/35 bg-charcoal/85 p-6 backdrop-blur-md lg:grid-cols-12 lg:p-8">
          <div className="order-2 lg:order-1 lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-dashed border-lemon/30 bg-chocolate/80 p-2">
              {!imgErrors.lookout ? (
                <div className="relative">
                  <img
                    src={lookoutPatchworkImg}
                    alt="Artisanal stitched patchwork fabric illustration of a forest fire lookout tower and weather station on quilted ridges"
                    referrerPolicy="no-referrer"
                    onError={() => markImgError('lookout')}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <span className="absolute top-2.5 right-2.5 rounded border border-olive/50 bg-void/85 px-2 py-0.5 font-mono text-[10px] font-medium text-cream/90">
                    AI-Generated Image
                  </span>
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-void">
                  <Radio className="h-8 w-8 text-tangerine" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="order-1 space-y-5 lg:order-2 lg:col-span-6">
            <div>
              <p className="text-xs font-semibold text-lemon">
                03. Country Borders &amp; 04. Nearby Fire Radius Scanner
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-cream sm:text-3xl">
                Check how many active fires are near any location
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-cream/80">
                On the Satellite Map, hover over any country to see its name or click it to zoom in.
                Below, use our <strong className="text-cream">Nearby Fire Radius Scanner</strong>:
                enter any coordinates (like a town, forest reserve, or peak fire) and pick a{' '}
                <strong className="text-cream">10 km, 25 km, or 50 km circle</strong> to count real
                fires burning inside that ring right now.
              </p>
            </div>

            {/* Real Interactive Proximity Scanner */}
            <div className="space-y-3 rounded-xl border border-dashed border-olive/40 bg-chocolate/75 p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-cream">
                  Search Radius Around Coordinate
                </span>
                <div className="flex gap-1">
                  {([10, 25, 50] as const).map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setAlertRadiusKm(km)}
                      className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                        alertRadiusKm === km
                          ? 'bg-bright-yellow text-void font-bold'
                          : 'bg-charcoal text-cream/80 border border-olive/40 hover:border-lemon'
                      }`}
                    >
                      {km}km
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="watch-lat" className="block text-[11px] text-cream/65">
                    Latitude
                  </label>
                  <input
                    id="watch-lat"
                    type="number"
                    step="0.01"
                    value={hasCustomCoord ? watchLat : effectiveLat.toFixed(4)}
                    onChange={(e) => {
                      setHasCustomCoord(true);
                      setWatchLat(e.target.value);
                    }}
                    className="mt-1 w-full rounded border border-olive/40 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="watch-lon" className="block text-[11px] text-cream/65">
                    Longitude
                  </label>
                  <input
                    id="watch-lon"
                    type="number"
                    step="0.01"
                    value={hasCustomCoord ? watchLon : effectiveLon.toFixed(4)}
                    onChange={(e) => {
                      setHasCustomCoord(true);
                      setWatchLon(e.target.value);
                    }}
                    className="mt-1 w-full rounded border border-olive/40 bg-void px-2.5 py-1.5 font-mono text-xs text-cream focus:border-bright-yellow focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-olive/30 pt-3">
                <div>
                  <div className="font-mono font-semibold text-tangerine tabular-nums">
                    {proximityScan.nearbyCount.toLocaleString()} fires within {alertRadiusKm} km
                  </div>
                  <div className="text-[11px] text-cream/65">
                    {proximityScan.closestKm !== null
                      ? `Nearest active heat spot: ${proximityScan.closestKm.toFixed(1)} km away`
                      : 'Waiting for live satellite feed'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasCustomCoord && strongestHotspot && (
                    <button
                      type="button"
                      onClick={() => setHasCustomCoord(false)}
                      className="rounded border border-olive/40 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-lemon hover:border-bright-yellow cursor-pointer"
                    >
                      Peak Fire
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/map?lat=${effectiveLat}&lon=${effectiveLon}`)
                    }
                    className="inline-flex items-center gap-1 rounded bg-tangerine px-3 py-1.5 font-semibold text-void hover:bg-bright-yellow cursor-pointer"
                  >
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    <span>View Area</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* 06. Map Key API Coverage, Data Scope & Clean CSV Export */}
        <article className="rounded-2xl border border-olive/35 bg-charcoal/85 p-6 backdrop-blur-md sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-tangerine">
                06. NASA FIRMS Map Key Coverage &amp; Clean CSV Export
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold text-cream">
                Live Map Key API querying with instant CSV export
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-cream/80">
                SlowBurn fetches live and 1-year sampled thermal detections directly through the
                NASA FIRMS Map Key API and lets you download any filtered region or date range as a
                clean CSV.
              </p>
            </div>

            <a
              href={buildExportCsvUrl()}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-olive/45 bg-chocolate px-4 py-2 text-xs font-semibold text-cream hover:border-bright-yellow hover:bg-bright-yellow hover:text-void transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Live CSV</span>
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-tangerine/40 bg-chocolate/75 p-4 text-xs leading-relaxed text-cream/85">
              <p className="font-semibold text-bright-yellow">
                Data Scope &amp; Funding Limitation (Map Key vs. 6 GB Archive)
              </p>
              <p className="mt-1.5">
                Right now, we are only able to use the{' '}
                <strong className="text-cream">NASA FIRMS Map Key API</strong> rather than hosting
                the entire <strong className="text-cream">6 GB</strong> bulk historical dataset due
                to server storage and hosting funding constraints. We plan to host the complete 6 GB
                dataset in the future once funding and infrastructure capacity are available.
              </p>
            </div>

            <div className="rounded-xl border border-olive/40 bg-chocolate/75 p-4 text-xs leading-relaxed text-cream/85">
              <p className="font-semibold text-lemon">AI Disclosure (Images &amp; Code)</p>
              <p className="mt-1.5">
                All illustrative quilt plates, satellite cards, and painted backdrop artwork on this
                site are <strong className="text-cream">AI-generated images</strong> (marked on each
                visual), and portions of the application <strong className="text-cream">code</strong>{' '}
                were developed with AI assistance. All fire telemetry comes directly from NASA FIRMS.
              </p>
            </div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-olive/30 bg-void p-4 font-mono text-[11px] leading-relaxed text-lemon">
            {sampleCsvPreview}
          </pre>
        </article>
      </div>
    </section>
  );
}
