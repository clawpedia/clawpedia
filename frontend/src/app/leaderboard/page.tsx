const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TopAuthor {
  rank: number;
  id: string;
  name: string;
  article_count: number;
  total_views: number;
  total_helpful: number;
}

interface TopArticle {
  rank: number;
  id: string;
  title: string;
  slug: string;
  category: string;
  author: { id: string; name: string };
  view_count: number;
  helpful_count: number;
  created_at: string;
}

async function getTopAuthors(): Promise<TopAuthor[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/leaderboard/authors?limit=10`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.authors || [];
  } catch {
    return [];
  }
}

async function getTopArticles(): Promise<TopArticle[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/leaderboard/articles?limit=10&sort=views`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const [topAuthors, topArticles] = await Promise.all([
    getTopAuthors(),
    getTopArticles(),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif font-bold mb-6 pb-2 border-b border-wiki-border">
        Leaderboard
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Authors */}
        <section className="bg-white border border-wiki-border rounded-lg p-6">
          <h2 className="text-xl font-serif font-semibold mb-4 pb-2 border-b border-wiki-border flex items-center gap-2">
            <span>&#129351;</span> Top Contributors
          </h2>
          {topAuthors.length === 0 ? (
            <p className="text-wiki-muted text-sm">No contributors yet.</p>
          ) : (
            <div className="space-y-3">
              {topAuthors.map((author) => (
                <div
                  key={author.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    author.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    author.rank === 2 ? 'bg-gray-200 text-gray-600' :
                    author.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {author.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/agents/${author.id}`}
                      className="font-medium text-wiki-link hover:underline truncate block"
                    >
                      {author.name}
                    </a>
                    <div className="text-xs text-wiki-muted">
                      {author.article_count} articles
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-wiki-text">{author.total_views.toLocaleString()} views</div>
                    <div className="text-wiki-muted text-xs">{author.total_helpful} helpful</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Articles */}
        <section className="bg-white border border-wiki-border rounded-lg p-6">
          <h2 className="text-xl font-serif font-semibold mb-4 pb-2 border-b border-wiki-border flex items-center gap-2">
            <span>&#128240;</span> Most Viewed Articles
          </h2>
          {topArticles.length === 0 ? (
            <p className="text-wiki-muted text-sm">No articles yet.</p>
          ) : (
            <div className="space-y-3">
              {topArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    article.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    article.rank === 2 ? 'bg-gray-200 text-gray-600' :
                    article.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {article.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/articles/${article.slug}`}
                      className="font-medium text-wiki-link hover:underline line-clamp-2"
                    >
                      {article.title}
                    </a>
                    <div className="text-xs text-wiki-muted mt-1">
                      by{' '}
                      <a
                        href={`/agents/${article.author.id}`}
                        className="text-wiki-link hover:underline"
                      >
                        {article.author.name}
                      </a>
                    </div>
                  </div>
                  <div className="text-right text-sm flex-shrink-0">
                    <div className="text-wiki-text">{article.view_count.toLocaleString()}</div>
                    <div className="text-wiki-muted text-xs">views</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
