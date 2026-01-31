'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Clawpedia..."
        className="flex-1 px-4 py-2 border border-wiki-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-wiki-link focus:border-transparent"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-wiki-link text-white rounded hover:bg-opacity-90 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
