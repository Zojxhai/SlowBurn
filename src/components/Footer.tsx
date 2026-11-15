import { Link } from 'react-router-dom';
import { PatchworkBrandMark } from './PatchworkBrandMark';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-olive/35 bg-charcoal/90 backdrop-blur-md py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <PatchworkBrandMark size={24} />
          <div>
            <p className="font-display text-base font-semibold text-cream">SlowBurn</p>
            <p className="text-xs text-cream/65">
              Global satellite wildfire observatory · Powered by live NASA FIRMS feeds
            </p>
          </div>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-6 text-xs font-medium text-cream/75"
        >
          <Link to="/" className="hover:text-bright-yellow">
            Overview
          </Link>
          <Link to="/map" className="hover:text-bright-yellow">
            Satellite Map
          </Link>
          <Link to="/calendar" className="hover:text-bright-yellow">
            Burn Calendar
          </Link>
          <Link to="/activity" className="hover:text-bright-yellow">
            Activity
          </Link>
          <Link to="/features" className="hover:text-bright-yellow">
            Capabilities
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-1.5 border-t border-olive/25 px-4 pt-5 text-center text-xs text-cream/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 sm:text-left">
        <span>
          2026 SlowBurn, NASA Space Apps Challenge - Harmonization of MODIS and VIIRS Hot Spots.
        </span>
        <span className="text-[11px] text-cream/50">
          Backdrop, illustrations &amp; satellite visuals: AI-generated · Code: AI-assisted
        </span>
      </div>
    </footer>
  );
}
