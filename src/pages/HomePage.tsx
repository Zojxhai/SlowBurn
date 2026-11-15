import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import { useFirmsData } from '../context/FirmsDataContext';
import { SATELLITE_FEEDS } from '../types/firms';
import { FeedShapeIcon } from '../components/FeedShapeIcon';
import heroQuiltImg from '../assets/images/patchwork_hero_quilt_1794640078067.jpg';

export function HomePage() {
  const { data, loading, error, selectSingleSource, selectAllSources, refreshData } =
    useFirmsData();
  const [imgError, setImgError] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const totalDetections = data?.summary.totalDetections ?? 0;
  const highConfPct =
    totalDetections > 0 && data
      ? (data.summary.confidenceCounts.h / totalDetections) * 100
      : 0;

  // Top 4 highest-FRP real detections currently active
  const topHotspots = useMemo(() => {
    if (!data?.points || data.points.length === 0) return [];
    return [...data.points].sort((a, b) => b[3] - a[3]).slice(0, 4);
  }, [data?.points]);

  return (
    <div className="relative z-10">
      {/* Editorial Hero */}
      <section className="border-b border-olive/30 pt-12 pb-14 sm:pt-16 sm:pb-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <p className="text-xs font-medium tracking-wide text-lemon">
                SlowBurn Observatory · Live NASA FIRMS Satellite Feeds
              </p>

              <h1
                className="mt-3 font-display text-4xl font-semibold tracking-tight text-cream sm:text-5xl lg:text-[3.4rem] lg:leading-[1.06]"
                style={{ textWrap: 'balance' }}
              >
                Reading the earth&apos;s heat, stitched into one clear view.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/80">
                SlowBurn pairs high-resolution satellite imagery with live thermal detections
                from NOAA-20, NOAA-21, Suomi-NPP, and MODIS via the NASA FIRMS Map Key API for
                live monitoring and 1-year trace-back.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={() => navigate('/map')}
                  className="inline-flex items-center gap-2 rounded-lg bg-tangerine px-6 py-3 text-sm font-bold text-void transition-colors duration-150 hover:bg-bright-yellow whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open Satellite Map</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <Link
                  to="/activity"
                  className="inline-flex items-center gap-1.5 border-b border-lemon/50 pb-0.5 text-sm font-semibold text-lemon transition-colors hover:border-bright-yellow hover:text-bright-yellow whitespace-nowrap shrink-0"
                >
                  View Fire Activity &amp; Analytics
                </Link>
              </div>
            </motion.div>

            {/* Right Patchwork Quilt Artwork */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="rounded-2xl border border-olive/40 bg-chocolate/80 p-2.5 shadow-lg backdrop-blur-md">
                <div className="overflow-hidden rounded-xl border border-dashed border-lemon/30">
                  {!imgError ? (
                    <img
                      src={heroQuiltImg}
                      alt="Hand-stitched textile patchwork quilt showing forested mountain ridges, an orbiting satellite, and a glowing amber thermal horizon"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-charcoal p-8 text-center">
                      <p className="font-display text-lg text-cream">
                        SlowBurn Patchwork Landscape
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-2 pt-2.5 pb-0.5 text-xs text-cream/70">
                  <span className="font-medium text-cream">
                    Stitched Field Plate I — Orbital Thermal Horizon
                  </span>
                  <span className="font-mono text-[11px] text-lemon">
                    AI-Generated Image
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Live Global Telemetry Ledger */}
          {error ? (
            <div className="mt-12 flex items-center justify-between rounded-xl border border-ember/60 bg-chocolate/90 px-5 py-4 text-xs text-cream">
              <span>Unable to load live NASA FIRMS feed: {error}</span>
              <button
                type="button"
                onClick={refreshData}
                className="rounded border border-bright-yellow bg-charcoal px-3 py-1 font-semibold text-bright-yellow hover:bg-bright-yellow hover:text-void transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="mt-12 rounded-xl border border-olive/40 bg-charcoal/85 backdrop-blur-md">
              <div className="grid grid-cols-2 divide-y divide-olive/25 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-medium text-cream/65">
                    Active Fire Spots ({data?.meta.days ?? 1}d)
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-bright-yellow tabular-nums">
                    {loading ? 'Loading...' : totalDetections.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-cream/65">
                    Total heat pixels spotted worldwide
                  </p>
                </div>

                <div className="p-5 sm:p-6">
                  <p className="text-xs font-medium text-cream/65">
                    Strongest Fire Energy (Peak FRP)
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-tangerine tabular-nums">
                    {loading ? '—' : data?.summary.peakFrp.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-cream/60">MW</span>
                  </p>
                  <p className="mt-1 text-xs text-cream/65">
                    Average {loading ? '—' : data?.summary.meanFrp.toFixed(2)} Megawatts
                  </p>
                </div>

                <div className="p-5 sm:p-6">
                  <p className="text-xs font-medium text-cream/65">
                    High-Certainty Fires
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-lemon tabular-nums">
                    {loading ? '—' : `${highConfPct.toFixed(1)}%`}
                  </p>
                  <p className="mt-1 text-xs text-cream/65">
                    {loading
                      ? 'Calculating...'
                      : `${data?.summary.confidenceCounts.h.toLocaleString() ?? 0} verified high-confidence`}
                  </p>
                </div>

                <div className="p-5 sm:p-6">
                  <p className="text-xs font-medium text-cream/65">
                    Average Glow Temp (Kelvin)
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-cream tabular-nums">
                    {loading ? '—' : data?.summary.meanBrightTi4.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-cream/60">K</span>
                  </p>
                  <p className="mt-1 text-xs text-cream/65">
                    {data?.summary.dayCount.toLocaleString() ?? 0} Daytime ·{' '}
                    {data?.summary.nightCount.toLocaleString() ?? 0} Night
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Live Peak Hotspots + Satellite Fleet Guide */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Top Real Active Hotspots Spotlight */}
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-olive/35 pb-4">
              <div>
                <p className="text-xs font-medium text-lemon">
                  Highest Heat Output Right Now
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                  Strongest active fires on Earth today
                </h2>
              </div>
              <Link
                to="/map"
                className="inline-flex items-center gap-1 text-xs font-semibold text-tangerine hover:text-bright-yellow hover:underline"
              >
                Inspect all on satellite imagery <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <div className="col-span-full py-8 text-center text-xs text-cream/70">
                  Scanning live NASA FIRMS peak detections...
                </div>
              ) : (
                topHotspots.map((pt, idx) => {
                  const feed = SATELLITE_FEEDS[pt[2]] ?? SATELLITE_FEEDS[0];
                  return (
                    <button
                      key={`${pt[0]}-${pt[1]}-${idx}`}
                      type="button"
                      onClick={() => navigate(`/map?lat=${pt[1]}&lon=${pt[0]}`)}
                      className="group flex flex-col justify-between rounded-xl border border-olive/35 bg-charcoal/85 p-5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-bright-yellow/70 hover:bg-chocolate/90 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream">
                            <FeedShapeIcon shape={feed.shape} color={feed.color} size={11} />
                            <span>{feed.shortLabel}</span>
                          </span>
                          <span className="font-mono text-[11px] text-cream/65">
                            {pt[8] === 1 ? 'Night pass' : 'Day pass'}
                          </span>
                        </div>

                        <p className="mt-3 font-mono text-2xl font-semibold text-tangerine tabular-nums">
                          {pt[3].toFixed(1)}{' '}
                          <span className="text-xs font-normal text-cream/60">MW</span>
                        </p>
                        <p className="mt-1 font-mono text-xs text-cream/75 tabular-nums">
                          {pt[1].toFixed(3)}°, {pt[0].toFixed(3)}°
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-dashed border-olive/35 pt-3 text-xs">
                        <span className="font-mono text-[11px] text-cream/65">
                          {pt[5].toFixed(1)} K · {pt[6]}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-lemon group-hover:text-bright-yellow">
                          <MapPin className="h-3 w-3" />
                          Locate
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Meet the 4 Satellites (Pictures, Explanations & Fun Facts) */}
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-olive/35 pb-4">
              <div>
                <p className="text-xs font-medium text-lemon">
                  Meet the Orbiting Fleet · Distinct Tiny Map Specks
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
                  Which satellites are watching Earth right now?
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  selectAllSources();
                  navigate('/map');
                }}
                className="rounded-lg border border-olive/45 bg-forest-dark/90 px-4 py-2 text-xs font-semibold text-lemon hover:border-bright-yellow hover:text-bright-yellow transition-colors cursor-pointer"
              >
                Overlay All 4 Feeds on Map
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {SATELLITE_FEEDS.map((feed) => {
                const liveFeed = data?.bySource.find((s) => s.id === feed.id);
                return (
                  <article
                    key={feed.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-olive/45 bg-chocolate/80 backdrop-blur-md"
                  >
                    <div>
                      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-olive/35 bg-void">
                        <img
                          src={feed.image}
                          alt={`${feed.label} spacecraft orbiting Earth`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute top-2.5 right-2.5 rounded border border-olive/50 bg-void/85 px-2 py-0.5 font-mono text-[10px] font-medium text-cream/90">
                          AI-Generated Image
                        </span>
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-void/95 via-void/70 to-transparent px-4 pt-6 pb-2.5 text-xs">
                          <span className="inline-flex items-center gap-2 font-semibold text-cream">
                            <FeedShapeIcon shape={feed.shape} color={feed.color} size={13} />
                            <span>
                              Map speck: {feed.shape} · {feed.resolution} pixel grid
                            </span>
                          </span>
                          <span className="font-mono font-semibold text-bright-yellow tabular-nums">
                            {loading
                              ? '—'
                              : `${liveFeed ? liveFeed.count.toLocaleString() : '0'} spots`}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-display text-xl font-semibold text-cream">
                          {feed.label}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-cream/80">
                          {feed.plainSummary}
                        </p>
                        <div className="mt-3 rounded-lg border border-olive/30 bg-charcoal/80 px-3.5 py-2.5 text-xs leading-relaxed text-cream/85">
                          <span className="font-semibold text-bright-yellow">Fun fact: </span>
                          {feed.funFact}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={() => {
                          selectSingleSource(feed.id);
                          navigate('/map');
                        }}
                        className="w-full rounded-lg border border-olive/45 bg-charcoal px-3 py-2 text-xs font-semibold text-cream transition-colors hover:border-tangerine hover:bg-tangerine hover:text-void cursor-pointer"
                      >
                        Show only {feed.shortLabel} on Satellite Map
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
