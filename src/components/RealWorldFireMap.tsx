import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import {
  BoxSelect,
  Layers,
  LocateFixed,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useFirmsData } from '../context/FirmsDataContext';
import { FirmsMapPoint, SATELLITE_FEEDS } from '../types/firms';
import { FeedShapeIcon } from './FeedShapeIcon';
import {
  computeNormalizedBbox,
  CountryFeature,
  getNormalizedCountriesGeoJson,
} from '../utils/countryAtlas';

interface HoveredSpot {
  point: FirmsMapPoint;
  screenX: number;
  screenY: number;
}

interface DrawDragState {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

function getHarmonizedFrpColor(frp: number): string {
  if (frp >= 120) return '#F97316'; // Extreme Orange
  if (frp >= 35) return '#FB923C'; // High Tangerine
  if (frp >= 10) return '#FACC15'; // Moderate Bright Yellow
  return '#BEF264'; // Smoldering Lemon
}

export function RealWorldFireMap() {
  const {
    data,
    loading,
    error,
    selectedSources,
    days,
    selectedDate,
    harmonizedMode,
    setHarmonizedMode,
    selectedCountry,
    setSelectedCountry,
    setCustomBounds,
    toggleSource,
    selectAllSources,
    selectSingleSource,
    setDays,
    refreshData,
  } = useFirmsData();

  const [searchParams] = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const countryLayerRef = useRef<L.GeoJSON | null>(null);
  const customBoxLayerRef = useRef<L.Rectangle | null>(null);

  const visibleProjectedRef = useRef<
    Array<{ x: number; y: number; raw: FirmsMapPoint }>
  >([]);

  const [showLabels, setShowLabels] = useState(true);
  const [drawMode, setDrawMode] = useState(false);
  const [drawDrag, setDrawDrag] = useState<DrawDragState | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<HoveredSpot | null>(null);
  const [pinnedSpot, setPinnedSpot] = useState<FirmsMapPoint | null>(null);

  const pointsRef = useRef<FirmsMapPoint[]>([]);
  pointsRef.current = data?.points ?? [];
  const hoveredSpotRef = useRef<HoveredSpot | null>(null);
  hoveredSpotRef.current = hoveredSpot;
  const pinnedSpotRef = useRef<FirmsMapPoint | null>(null);
  pinnedSpotRef.current = pinnedSpot;
  const harmonizedRef = useRef<boolean>(harmonizedMode);
  harmonizedRef.current = harmonizedMode;
  const drawModeRef = useRef<boolean>(drawMode);
  drawModeRef.current = drawMode;

  // Antimeridian-safe 50m GeoJSON country boundaries
  const countriesGeoJson = useMemo(() => getNormalizedCountriesGeoJson(), []);

  const redrawCanvas = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    const host = mapHostRef.current;
    if (!map || !canvas || !host) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const zoom = map.getZoom();
    const r = Math.min(2.6, Math.max(1.15, 0.9 + zoom * 0.16));
    const drawOutline = zoom >= 5;
    const isUnified = harmonizedRef.current;

    const pts = pointsRef.current;
    const visiblePts: Array<{ x: number; y: number; raw: FirmsMapPoint }> = [];

    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const lat = Math.max(-85, Math.min(85, pt[1]));
      const rawLon = pt[0];

      let screen = map.latLngToContainerPoint([lat, rawLon]);
      if (screen.x < -10) {
        const eastScreen = map.latLngToContainerPoint([lat, rawLon + 360]);
        if (eastScreen.x >= -10 && eastScreen.x <= width + 10) {
          screen = eastScreen;
        }
      } else if (screen.x > width + 10) {
        const westScreen = map.latLngToContainerPoint([lat, rawLon - 360]);
        if (westScreen.x >= -10 && westScreen.x <= width + 10) {
          screen = westScreen;
        }
      }

      if (
        screen.x < -8 ||
        screen.x > width + 8 ||
        screen.y < -8 ||
        screen.y > height + 8
      ) {
        continue;
      }

      visiblePts.push({ x: screen.x, y: screen.y, raw: pt });

      const px = screen.x;
      const py = screen.y;

      if (isUnified) {
        // Unified Harmonized thermal speck: colored by radiative power (MW) regardless of sensor
        ctx.fillStyle = getHarmonizedFrpColor(pt[3]);
        ctx.strokeStyle = 'rgba(13, 12, 9, 0.78)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (drawOutline) ctx.stroke();
        continue;
      }

      const feed = SATELLITE_FEEDS[pt[2]] ?? SATELLITE_FEEDS[0];
      ctx.fillStyle = feed.color;
      ctx.strokeStyle = 'rgba(13, 12, 9, 0.78)';
      ctx.lineWidth = 0.65;

      if (feed.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (drawOutline) ctx.stroke();
      } else if (feed.shape === 'diamond') {
        const d = r * 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py - d);
        ctx.lineTo(px + d, py);
        ctx.lineTo(px, py + d);
        ctx.lineTo(px - d, py);
        ctx.closePath();
        ctx.fill();
        if (drawOutline) ctx.stroke();
      } else if (feed.shape === 'triangle') {
        const h = r * 1.25;
        ctx.beginPath();
        ctx.moveTo(px, py - h);
        ctx.lineTo(px + h, py + h * 0.85);
        ctx.lineTo(px - h, py + h * 0.85);
        ctx.closePath();
        ctx.fill();
        if (drawOutline) ctx.stroke();
      } else {
        const s = r * 1.85;
        ctx.beginPath();
        ctx.rect(px - s / 2, py - s / 2, s, s);
        ctx.fill();
        if (drawOutline) ctx.stroke();
      }
    }

    visibleProjectedRef.current = visiblePts;

    const active = hoveredSpotRef.current?.point ?? pinnedSpotRef.current;
    if (active) {
      const screen = map.latLngToContainerPoint([
        Math.max(-85, Math.min(85, active[1])),
        active[0],
      ]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#0D0C09';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) return;

    const focusLat = Number(searchParams.get('lat'));
    const focusLon = Number(searchParams.get('lon'));
    const hasFocus =
      !Number.isNaN(focusLat) &&
      !Number.isNaN(focusLon) &&
      searchParams.has('lat') &&
      searchParams.has('lon');

    const map = L.map(mapHostRef.current, {
      center: hasFocus ? [focusLat, focusLon] : [18, 12],
      zoom: hasFocus ? 9 : 2,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics · Data © NASA FIRMS',
        maxZoom: 18,
      }
    ).addTo(map);

    const labelsLayer = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.72,
      }
    ).addTo(map);
    labelsLayerRef.current = labelsLayer;

    const countryLayer = L.geoJSON(countriesGeoJson as unknown as GeoJSON.GeoJsonObject, {
      style: () => ({
        color: 'rgba(243, 232, 104, 0.48)',
        weight: 1.05,
        fillColor: '#EAB308',
        fillOpacity: 0,
        className: 'slowburn-country-path',
      }),
      onEachFeature: (feat, layer) => {
        const cFeat = feat as CountryFeature;
        const countryName = cFeat.properties?.name ?? 'Territory';
        const countryId = String(cFeat.id ?? countryName);
        const [west, south, east, north] = computeNormalizedBbox(cFeat.geometry);

        layer.on('mouseover', (e: L.LeafletMouseEvent) => {
          if (drawModeRef.current) return;
          const pathLayer = layer as L.Path & { _path?: SVGPathElement };
          pathLayer.setStyle({
            color: '#FACC15',
            weight: 2.2,
            fillColor: '#EAB308',
            fillOpacity: 0.14,
          });
          pathLayer.bringToFront();
          if (pathLayer._path) {
            pathLayer._path.classList.add('slowburn-country-hovered');
          }
          setHoveredCountry({
            name: countryName,
            x: e.containerPoint.x,
            y: e.containerPoint.y,
          });
        });

        layer.on('mousemove', (e: L.LeafletMouseEvent) => {
          if (drawModeRef.current) return;
          setHoveredCountry({
            name: countryName,
            x: e.containerPoint.x,
            y: e.containerPoint.y,
          });
        });

        layer.on('mouseout', () => {
          const pathLayer = layer as L.Path & { _path?: SVGPathElement };
          countryLayer.resetStyle(pathLayer);
          if (pathLayer._path) {
            pathLayer._path.classList.remove('slowburn-country-hovered');
          }
          setHoveredCountry(null);
        });

        layer.on('click', () => {
          if (drawModeRef.current) return;
          if (hoveredSpotRef.current) {
            setPinnedSpot(hoveredSpotRef.current.point);
            return;
          }
          setSelectedCountry({
            id: countryId,
            name: countryName,
            bbox: [west, south, east, north],
          });
          const bounds = (layer as L.Polygon).getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [36, 36], maxZoom: 7 });
          }
        });
      },
    }).addTo(map);

    countryLayerRef.current = countryLayer;
    mapRef.current = map;

    map.on('move zoom viewreset resize', redrawCanvas);
    redrawCanvas();

    return () => {
      map.off('move zoom viewreset resize', redrawCanvas);
      map.remove();
      mapRef.current = null;
    };
  }, [countriesGeoJson, redrawCanvas, searchParams, setSelectedCountry]);

  useEffect(() => {
    const map = mapRef.current;
    const labels = labelsLayerRef.current;
    if (!map || !labels) return;
    if (showLabels && !map.hasLayer(labels)) {
      labels.addTo(map);
    } else if (!showLabels && map.hasLayer(labels)) {
      map.removeLayer(labels);
    }
  }, [showLabels]);

  // Toggle Leaflet map dragging cleanly when Draw Area tool is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawMode) {
      map.dragging.disable();
      setHoveredCountry(null);
    } else {
      map.dragging.enable();
      setDrawDrag(null);
    }
  }, [drawMode]);

  // Draw persistent dashed rectangle whenever a custom drawn / typed bbox is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (customBoxLayerRef.current) {
      map.removeLayer(customBoxLayerRef.current);
      customBoxLayerRef.current = null;
    }

    if (selectedCountry?.isCustom) {
      const [west, south, east, north] = selectedCountry.bbox;
      const rect = L.rectangle(
        [
          [south, west],
          [north, east],
        ],
        {
          color: '#FB923C',
          weight: 2,
          dashArray: '6 4',
          fillColor: '#FACC15',
          fillOpacity: 0.09,
          interactive: false,
        }
      ).addTo(map);
      customBoxLayerRef.current = rect;
    }
  }, [selectedCountry]);

  // Highlight selected country border & fit bounds when country/region changes
  useEffect(() => {
    const map = mapRef.current;
    const countryLayer = countryLayerRef.current;
    if (!map || !countryLayer) return;

    countryLayer.eachLayer((layer) => {
      const feat = (layer as L.GeoJSON & { feature?: CountryFeature }).feature;
      const pathLayer = layer as L.Path;
      const isActive =
        Boolean(selectedCountry && !selectedCountry.isCustom) &&
        String(feat?.id ?? feat?.properties?.name) === selectedCountry?.id;
      if (isActive) {
        pathLayer.setStyle({
          color: '#FACC15',
          weight: 2.2,
          fillColor: '#EAB308',
          fillOpacity: 0.08,
        });
        pathLayer.bringToFront();
      } else {
        countryLayer.resetStyle(pathLayer);
      }
    });
  }, [selectedCountry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCountry) return;
    const [west, south, east, north] = selectedCountry.bbox;
    if (east - west < 190) {
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [36, 36], maxZoom: 8 }
      );
    }
  }, [selectedCountry]);

  useEffect(() => {
    redrawCanvas();
  }, [data?.points, hoveredSpot, pinnedSpot, harmonizedMode, redrawCanvas]);

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const host = mapHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;

    if (drawMode && drawDrag) {
      setDrawDrag((prev) => (prev ? { ...prev, curX: rx, curY: ry } : null));
      return;
    }

    const visible = visibleProjectedRef.current;
    let best: FirmsMapPoint | null = null;
    let bestDistSq = 100;

    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const dx = p.x - rx;
      const dy = p.y - ry;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = p.raw;
      }
    }

    if (best) {
      setHoveredSpot({ point: best, screenX: rx, screenY: ry });
    } else if (hoveredSpotRef.current) {
      setHoveredSpot(null);
    }
  };

  const handleDrawPointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawMode || !mapHostRef.current) return;
    const rect = mapHostRef.current.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;
    setDrawDrag({ startX: rx, startY: ry, curX: rx, curY: ry });
  };

  const handleDrawPointerUp = () => {
    if (!drawMode || !drawDrag || !mapRef.current) {
      setDrawDrag(null);
      return;
    }
    const dx = Math.abs(drawDrag.curX - drawDrag.startX);
    const dy = Math.abs(drawDrag.curY - drawDrag.startY);
    if (dx < 12 || dy < 12) {
      setDrawDrag(null);
      return;
    }
    const map = mapRef.current;
    const p1 = map.containerPointToLatLng([
      Math.min(drawDrag.startX, drawDrag.curX),
      Math.max(drawDrag.startY, drawDrag.curY),
    ]);
    const p2 = map.containerPointToLatLng([
      Math.max(drawDrag.startX, drawDrag.curX),
      Math.min(drawDrag.startY, drawDrag.curY),
    ]);

    const west = Math.max(-180, Math.min(180, p1.lng));
    const east = Math.max(-180, Math.min(180, p2.lng));
    const south = Math.max(-85, Math.min(85, p1.lat));
    const north = Math.max(-85, Math.min(85, p2.lat));

    if (east > west && north > south) {
      const label = `Drawn Box (${south.toFixed(1)}°..${north.toFixed(1)}°, ${west.toFixed(1)}°..${east.toFixed(1)}°)`;
      setCustomBounds(label, [west, south, east, north]);
    }
    setDrawDrag(null);
    setDrawMode(false);
  };

  const handleResetView = () => {
    setDrawMode(false);
    setSelectedCountry(null);
    setPinnedSpot(null);
    mapRef.current?.setView([18, 12], 2, { animate: true });
  };

  const allSelected = selectedSources.length === SATELLITE_FEEDS.length;
  const inspectedSpot = hoveredSpot?.point ?? pinnedSpot;
  const inspectedFeed = inspectedSpot
    ? SATELLITE_FEEDS[inspectedSpot[2]] ?? SATELLITE_FEEDS[0]
    : null;

  return (
    <div className="space-y-5">
      {/* Satellite Feed & Harmonization Selector */}
      <div className="rounded-xl border border-olive/35 bg-charcoal/88 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-olive/25 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-cream">
              {harmonizedMode
                ? 'Harmonized Multi-Sensor Thermal Stream'
                : 'Satellite Feeds & Marker Geometry'}
            </h2>
            <p className="text-xs text-cream/65">
              {harmonizedMode
                ? 'Sensor of origin is unified across MODIS (1km) & VIIRS (375m) so spots color-code by fire heat (MW) and regional burn patterns.'
                : 'Showing individual satellite constellations with distinct marker shapes on satellite imagery.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-olive/40 bg-void p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHarmonizedMode(true)}
                className={`rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  harmonizedMode
                    ? 'bg-forest-dark text-bright-yellow'
                    : 'text-cream/70 hover:text-cream'
                }`}
              >
                Harmonized
              </button>
              <button
                type="button"
                onClick={() => setHarmonizedMode(false)}
                className={`rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  !harmonizedMode
                    ? 'bg-tangerine text-void font-bold'
                    : 'text-cream/70 hover:text-cream'
                }`}
              >
                By Sensor
              </button>
            </div>

            <span className="ml-1 text-xs font-medium text-cream/70">Span:</span>
            {[
              { d: 1, label: '1d' },
              { d: 3, label: '3d' },
              { d: 5, label: '5d' },
              { d: 30, label: '30d' },
              { d: 90, label: '90d' },
              { d: 365, label: '1 Yr' },
            ].map((opt) => (
              <button
                key={opt.d}
                type="button"
                onClick={() => setDays(opt.d)}
                className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  days === opt.d && !selectedDate
                    ? 'border-bright-yellow bg-bright-yellow text-void'
                    : 'border-olive/40 bg-chocolate text-cream/85 hover:border-lemon'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              type="button"
              onClick={selectAllSources}
              className={`ml-1 rounded-md border px-3 py-1 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                allSelected
                  ? 'border-tangerine bg-tangerine text-void'
                  : 'border-olive/40 bg-chocolate text-cream hover:border-tangerine'
              }`}
            >
              All Feeds
            </button>
          </div>
        </div>

        {/* Distinct Shape Feed Toggles */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SATELLITE_FEEDS.map((feed) => {
            const isActive = selectedSources.includes(feed.id);
            const countEntry = data?.bySource.find((s) => s.id === feed.id);

            return (
              <div
                key={feed.id}
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 transition-colors ${
                  isActive
                    ? 'border-olive/50 bg-chocolate/80'
                    : 'border-olive/20 bg-void/60 opacity-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSource(feed.id)}
                  className="flex flex-1 items-center gap-2.5 text-left cursor-pointer"
                >
                  <FeedShapeIcon shape={feed.shape} color={feed.color} size={15} />
                  <div>
                    <div className="text-xs font-semibold text-cream">{feed.shortLabel}</div>
                    <div className="font-mono text-[11px] text-cream/65 tabular-nums">
                      {feed.resolution} ·{' '}
                      {countEntry ? countEntry.count.toLocaleString() : '—'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => selectSingleSource(feed.id)}
                  className="ml-2 rounded border border-olive/40 bg-charcoal px-2 py-0.5 text-[11px] font-medium text-lemon hover:border-bright-yellow cursor-pointer whitespace-nowrap"
                >
                  Only
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Satellite Map Frame */}
      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-xl border border-olive/45 bg-void shadow-lg"
      >
        {/* Top Map Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive/30 bg-charcoal/95 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-bright-yellow">
              {selectedCountry ? selectedCountry.name : 'Global Real Satellite Imagery'}
            </span>
            {selectedDate && (
              <span className="rounded border border-olive/50 bg-forest-dark/70 px-2 py-0.5 font-mono text-[11px] text-lemon">
                Historical: {selectedDate} ({days}d)
              </span>
            )}
            <span className="text-cream/40" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-cream/85 tabular-nums">
              {loading
                ? 'Syncing NASA FIRMS detections...'
                : data
                ? `${data.summary.harmonizedIndex.toLocaleString()} MODIS-eq · ${data.summary.fireEventClusters.toLocaleString()} fire clusters (${data.meta.totalDetections.toLocaleString()} pixels)`
                : 'Awaiting feed'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawMode((m) => !m)}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                drawMode
                  ? 'border-bright-yellow bg-tangerine text-void font-bold'
                  : 'border-olive/40 bg-chocolate text-cream hover:border-bright-yellow'
              }`}
            >
              <BoxSelect className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{drawMode ? 'Drag Box on Map...' : 'Draw Area'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLabels((s) => !s)}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                showLabels
                  ? 'border-forest-muted bg-forest-dark text-lemon'
                  : 'border-olive/35 bg-chocolate text-cream/80'
              }`}
            >
              <Layers className="h-3 w-3" aria-hidden="true" />
              <span>Labels</span>
            </button>

            {selectedCountry && (
              <button
                type="button"
                onClick={handleResetView}
                className="inline-flex items-center gap-1 rounded border border-tangerine/60 bg-chocolate px-2.5 py-1 text-xs font-semibold text-tangerine hover:bg-tangerine hover:text-void cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Global View</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Zoom in"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-olive/40 bg-chocolate text-cream hover:border-bright-yellow cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Zoom out"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-olive/40 bg-chocolate text-cream hover:border-bright-yellow cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              aria-label="Reset satellite view"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-olive/40 bg-chocolate text-cream hover:border-bright-yellow cursor-pointer"
            >
              <LocateFixed className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Error Strip */}
        {error && (
          <div className="flex items-center justify-between gap-4 border-b border-tangerine/40 bg-chocolate px-4 py-3 text-xs text-lemon">
            <span>
              <strong>Feed Error:</strong> {error}
            </span>
            <button
              type="button"
              onClick={refreshData}
              className="rounded border border-bright-yellow bg-tangerine px-3 py-1 font-bold text-void cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Map Canvas + Leaflet Container */}
        <div
          onMouseMove={handleContainerMouseMove}
          onMouseDown={handleDrawPointerDown}
          onMouseUp={handleDrawPointerUp}
          onMouseLeave={() => {
            setHoveredSpot(null);
            if (drawDrag) setDrawDrag(null);
          }}
          className={`relative h-[540px] w-full sm:h-[600px] ${
            drawMode ? 'cursor-crosshair select-none' : ''
          }`}
        >
          <div ref={mapHostRef} className="h-full w-full" />

          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 z-[450] h-full w-full"
          />

          {/* Interactive Rubber-Band Selection Overlay when Drawing Area */}
          {drawMode && drawDrag && (
            <div
              className="pointer-events-none absolute z-[510] border-2 border-dashed border-bright-yellow bg-bright-yellow/15"
              style={{
                left: Math.min(drawDrag.startX, drawDrag.curX),
                top: Math.min(drawDrag.startY, drawDrag.curY),
                width: Math.abs(drawDrag.curX - drawDrag.startX),
                height: Math.abs(drawDrag.curY - drawDrag.startY),
              }}
            />
          )}

          {/* Floating Country Name Tooltip */}
          {hoveredCountry && !hoveredSpot && !drawMode && (
            <div
              className="pointer-events-none absolute z-[500] rounded-md border border-bright-yellow/70 bg-charcoal/95 px-2.5 py-1 text-xs font-semibold text-bright-yellow shadow-lg backdrop-blur-xs"
              style={{
                left: Math.min(Math.max(12, hoveredCountry.x + 14), 920),
                top: Math.max(12, hoveredCountry.y - 34),
              }}
            >
              {hoveredCountry.name}
              <span className="ml-2 font-normal text-cream/65">Click to zoom</span>
            </div>
          )}

          {/* Floating Fire Spot Telemetry Tooltip */}
          {hoveredSpot && inspectedFeed && !drawMode && (
            <div
              className="pointer-events-none absolute z-[520] w-60 rounded-lg border border-tangerine/70 bg-charcoal/95 p-3 text-xs shadow-xl backdrop-blur-sm"
              style={{
                left: Math.min(Math.max(12, hoveredSpot.screenX + 16), 880),
                top: Math.max(12, hoveredSpot.screenY - 24),
              }}
            >
              <div className="flex items-center gap-2 border-b border-olive/30 pb-1.5">
                <FeedShapeIcon
                  shape={inspectedFeed.shape}
                  color={inspectedFeed.color}
                  size={12}
                />
                <span className="font-semibold text-cream">{inspectedFeed.label}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-[11px] tabular-nums">
                <span className="text-cream/60">Coords:</span>
                <span className="text-right text-cream">
                  {hoveredSpot.point[1].toFixed(3)}, {hoveredSpot.point[0].toFixed(3)}
                </span>
                <span className="text-cream/60">FRP:</span>
                <span className="text-right font-semibold text-tangerine">
                  {hoveredSpot.point[3].toFixed(2)} MW
                </span>
                <span className="text-cream/60">Bright Ti4:</span>
                <span className="text-right text-bright-yellow">
                  {hoveredSpot.point[5].toFixed(1)} K
                </span>
                <span className="text-cream/60">UTC Time:</span>
                <span className="text-right text-cream">
                  {hoveredSpot.point[6]} {hoveredSpot.point[7]}
                </span>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-[550] flex items-center justify-center bg-void/45 backdrop-blur-[1px]">
              <div className="rounded-lg border border-bright-yellow/50 bg-charcoal px-5 py-3 text-xs font-semibold text-lemon shadow-lg">
                Loading satellite detections...
              </div>
            </div>
          )}
        </div>

        {/* Map Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-olive/30 bg-charcoal/95 px-4 py-2.5 text-xs text-cream/85">
          {harmonizedMode ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-lemon">Harmonized FRP Ramp:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#BEF264]" /> &lt;10 MW
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FACC15]" /> 10–35 MW
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FB923C]" /> 35–120 MW
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" /> 120+ MW
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {SATELLITE_FEEDS.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5">
                  <FeedShapeIcon shape={f.shape} color={f.color} size={11} />
                  <span className="font-medium">{f.shortLabel}</span>
                </span>
              ))}
            </div>
          )}

          <div className="font-mono text-[11px] text-cream/65 tabular-nums">
            {data
              ? data.meta.truncatedMapPoints
                ? `Plotting ${data.meta.displayedPoints.toLocaleString()} sampled of ${data.meta.totalDetections.toLocaleString()} (peak + timeline)`
                : `Plotting all ${data.meta.displayedPoints.toLocaleString()} real detections`
              : 'Scroll to zoom · Drag to pan'}
          </div>
        </div>
      </div>

      {/* Pinned Fire Spot Card */}
      {pinnedSpot && inspectedFeed && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-tangerine/50 bg-charcoal/92 p-4">
          <div className="flex items-center gap-3">
            <FeedShapeIcon shape={inspectedFeed.shape} color={inspectedFeed.color} size={16} />
            <div>
              <p className="text-xs font-semibold text-bright-yellow">
                Pinned FIRMS Detection · {inspectedFeed.label}
              </p>
              <p className="font-mono text-xs text-cream/80 tabular-nums">
                Lat {pinnedSpot[1].toFixed(4)}, Lon {pinnedSpot[0].toFixed(4)} ·{' '}
                {pinnedSpot[6]} {pinnedSpot[7]} UTC · {pinnedSpot[8] === 1 ? 'Night' : 'Day'} ·{' '}
                FRP {pinnedSpot[3].toFixed(2)} MW · Bright Ti4 {pinnedSpot[5].toFixed(1)} K
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPinnedSpot(null)}
            className="rounded border border-olive/40 px-3 py-1 text-xs font-semibold text-cream hover:border-bright-yellow cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
