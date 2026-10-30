import { Link, NavLink } from 'react-router-dom';
import { BookIcon, SearchIcon, PlusIcon } from './icons';

export function TopBar() {
  return (
    <header className="bg-canvas border-b border-rule px-8 py-3.5 flex items-center justify-between gap-6">
      <Link to="/" className="flex items-center gap-2.5 text-ink hover:text-black transition-colors" aria-label="Heirloom home">
        <BookIcon width={22} height={22} />
        <span className="font-serif text-[22px] font-bold tracking-tight">Heirloom</span>
      </Link>

      <div className="relative flex-1 max-w-[580px]">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center justify-center">
          <SearchIcon width={17} height={17} />
        </span>
        <input
          type="text"
          defaultValue=""
          placeholder="Search your archive, e.g. which letters mention the farm?"
          aria-label="Search your archive"
          className="w-full pl-10 pr-4 py-2 font-sans text-[15px] text-ink bg-panel border border-rule rounded-btn placeholder:text-muted/70 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30"
        />
      </div>

      <nav className="flex items-center gap-6">
        <Link
          to="/add"
          className="inline-flex items-center gap-1.5 bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-[15px] font-semibold px-4 py-2 rounded-btn transition-colors"
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
