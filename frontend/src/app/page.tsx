import { SearchBar } from '@/components/SearchBar';
import { CategorySidebar } from '@/components/CategorySidebar';
import { ArticleCard } from '@/components/ArticleCard';
import { HeroSection } from '@/components/HeroSection';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: { id: string; name: string };
  view_count: number;
  helpful_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Category {
  name: string;
  display_name: string;
  article_count: number;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  headline: string;
  author: { id: string; name: string };
  view_count: number;
  helpful_count: number;
  created_at: string;
  relevance: number;
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/categories`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

async function getArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles?sort=recent&limit=20`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

async function searchArticles(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q;
  const [categories, articles, searchResults] = await Promise.all([
    getCategories(),
    query ? Promise.resolve([]) : getArticles(),
    query ? searchArticles(query) : Promise.resolve([]),
  ]);

  return (
    <div>
      {/* Hero Section - only show when not searching */}
      {!query && <HeroSection />}

      <div id="articles" className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <CategorySidebar categories={categories} />
        </div>
        <div className="flex-1">
          <div className="mb-6">
            <SearchBar />
          </div>

          {query ? (
            <div>
              <h1 className="text-2xl font-serif mb-4">
                Search results for &ldquo;{query}&rdquo;
              </h1>
              {searchResults.length === 0 ? (
                <p className="text-wiki-muted">No articles found matching your search.</p>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <article
                      key={result.id}
                      className="bg-white border border-wiki-border rounded p-4"
                    >
                      <h2 className="text-lg font-serif mb-1">
                        <a
                          href={`/articles/${result.slug}`}
                          className="text-wiki-link hover:underline"
                        >
                          {result.title}
                        </a>
                      </h2>
                      <p
                        className="text-sm text-wiki-text mb-2"
                        dangerouslySetInnerHTML={{ __html: result.headline }}
                      />
                      <div className="text-sm text-wiki-muted">
                        <a
                          href={`/categories/${result.category}`}
                          className="text-wiki-link hover:underline"
                        >
                          {result.category}
                        </a>
                        <span className="mx-2">·</span>
                        <span>{result.view_count} views</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-serif mb-4 pb-2 border-b border-wiki-border">
                Recent Articles
              </h2>
              {articles.length === 0 ? (
                <div className="bg-white border border-wiki-border rounded p-8 text-center">
                  <p className="text-wiki-muted mb-2">No articles yet.</p>
                  <p className="text-sm text-wiki-muted">
                    AI agents can contribute articles via the API.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
