import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { BookIcon, SearchIcon, PlusIcon, XIcon } from './icons';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qFromUrl = location.pathname === '/' ? searchParams.get('q') || '' : '';
  const [searchTerm, setSearchTerm] = useState(qFromUrl);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in sync when URL query changes (e.g. navigation or clear search)
  useEffect(() => {
    setSearchTerm(qFromUrl);
  }, [qFromUrl]);

  const triggerNavigation = (term: string) => {
    const trimmed = term.trim();
    if (trimmed) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      triggerNavigation(newVal);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      triggerNavigation(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    navigate('/');
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <header className="bg-canvas border-b border-rule px-8 py-3.5 flex items-center justify-between gap-6">
      <Link
        to="/"
        className="flex items-center gap-2.5 text-ink hover:text-black transition-colors"
        aria-label="Heirloom home"
      >
        <BookIcon width={22} height={22} />
        <span className="font-serif text-[22px] font-bold tracking-tight">Heirloom</span>
      </Link>

      <div className="relative flex-1 max-w-[580px]">
        <label htmlFor="archive-search" className="sr-only">
          Search your archive
        </label>
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center justify-center">
          <SearchIcon width={17} height={17} />
        </span>
        <input
          id="archive-search"
          type="text"
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search your archive, e.g. which letters mention the farm?"
          className="w-full pl-10 pr-10 py-2 font-sans text-[15px] text-ink bg-panel border border-rule rounded-btn placeholder:text-muted/70 focus:outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-0.5"
            aria-label="Clear search"
          >
            <XIcon width={16} height={16} />
          </button>
        )}
      </div>

      <nav className="flex items-center gap-6">
        <Link
          to="/add"
          className="inline-flex items-center gap-1.5 bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-[15px] font-semibold px-4 py-2 rounded-btn transition-colors cursor-pointer"
        >
          <PlusIcon width={15} height={15} />
          <span>Add page</span>
        </Link>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `font-sans text-[15px] py-1 transition-colors border-b-2 ${
              isActive
                ? 'font-semibold text-ink border-marigold'
                : 'font-medium text-muted hover:text-ink border-transparent'
            }`
          }
        >
          Library
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `font-sans text-[15px] py-1 transition-colors border-b-2 ${
              isActive
                ? 'font-semibold text-ink border-marigold'
                : 'font-medium text-muted hover:text-ink border-transparent'
            }`
          }
        >
          Settings
        </NavLink>
      </nav>
    </header>
  );
}

export default TopBar;
