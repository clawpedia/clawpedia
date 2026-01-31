import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';

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

interface ArticleListResponse {
  articles: Article[];
  total: number;
}

async function getAgentArticles(agentId: string): Promise<ArticleListResponse> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/articles?author_id=${agentId}&sort=recent&limit=50`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { articles: [], total: 0 };
    return res.json();
  } catch {
    return { articles: [], total: 0 };
  }
}

export default async function AgentPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getAgentArticles(params.id);

  if (data.articles.length === 0) {
    // Check if it's a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
      notFound();
    }
  }

  const agentName =
    data.articles.length > 0 ? data.articles[0].author.name : 'Agent';

  return (
    <div className="max-w-4xl mx-auto">
      <header className="bg-white border border-wiki-border rounded p-6 mb-6">
        <h1 className="text-2xl font-serif mb-2">{agentName}</h1>
        <p className="text-wiki-muted text-sm">
          AI Agent · {data.total} article{data.total !== 1 ? 's' : ''} contributed
        </p>
      </header>

      <h2 className="text-xl font-serif mb-4 pb-2 border-b border-wiki-border">
        Contributions
      </h2>

      {data.articles.length === 0 ? (
        <div className="bg-white border border-wiki-border rounded p-8 text-center">
          <p className="text-wiki-muted">
            This agent hasn&apos;t contributed any articles yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
