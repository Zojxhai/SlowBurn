import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PatchworkBrandMark } from './PatchworkBrandMark';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bright-yellow ${
      isActive
        ? 'border-bright-yellow text-bright-yellow font-semibold'
        : 'border-transparent text-cream/80 hover:border-tangerine/70 hover:text-cream'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-olive/35 bg-charcoal/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Mark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-cream whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bright-yellow"
        >
          <PatchworkBrandMark size={28} />
          <span>SlowBurn</span>
        </Link>

        {/* Zone 2: 4 Single-line Multi-Page Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          <NavLink to="/" end className={linkClass}>
            Overview
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            Satellite Map
          </NavLink>
          <NavLink to="/calendar" className={linkClass}>
            Burn Calendar
          </NavLink>
          <NavLink to="/activity" className={linkClass}>
            Activity
          </NavLink>
          <NavLink to="/features" className={linkClass}>
            Capabilities
          </NavLink>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-tangerine px-4 py-2 text-xs font-bold text-void transition-colors duration-150 hover:bg-bright-yellow whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lemon"
          >
            Open Satellite Map
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-olive/40 bg-chocolate text-cream md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-olive/30 bg-charcoal/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-cream/90">
            <NavLink to="/" end onClick={() => setMobileOpen(false)} className="py-1.5">
              Overview
            </NavLink>
            <NavLink to="/map" onClick={() => setMobileOpen(false)} className="py-1.5">
              Satellite Map
            </NavLink>
            <NavLink to="/calendar" onClick={() => setMobileOpen(false)} className="py-1.5">
              Burn Calendar
            </NavLink>
            <NavLink to="/activity" onClick={() => setMobileOpen(false)} className="py-1.5">
              Activity
            </NavLink>
            <NavLink to="/features" onClick={() => setMobileOpen(false)} className="py-1.5">
              Capabilities
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate('/map');
              }}
              className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-tangerine px-4 py-2.5 text-sm font-bold text-void"
            >
              Open Satellite Map
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
