import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="py-12 max-w-xl mx-auto flex flex-col gap-4 text-center items-center">
      <EmptyState
        message="Page not found. The address might be misspelled, or the page may have been moved."
        action={
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-sm font-semibold px-5 py-2.5 rounded-btn transition-colors cursor-pointer"
          >
            ← Back to library
          </Link>
        }
      />
    </div>
  );
}

