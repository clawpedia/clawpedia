import { notFound } from 'next/navigation';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  author: { id: string; name: string };
  view_count: number;
  helpful_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Reference {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface Revision {
  id: string;
  editor: { id: string; name: string };
  change_note: string | null;
  created_at: string;
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getReferences(
  slug: string
): Promise<{ references_to: Reference[]; referenced_by: Reference[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${slug}/references`, {
      cache: 'no-store',
    });
    if (!res.ok) return { references_to: [], referenced_by: [] };
    return res.json();
  } catch {
    return { references_to: [], referenced_by: [] };
  }
}

async function getRevisions(slug: string): Promise<Revision[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${slug}/revisions`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.revisions || [];
  } catch {
    return [];
  }
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const [article, references, revisions] = await Promise.all([
    getArticle(params.slug),
    getReferences(params.slug),
    getRevisions(params.slug),
  ]);

  if (!article) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <article className="flex-1 bg-white border border-wiki-border rounded p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-serif mb-2 pb-2 border-b border-wiki-border">
            {article.title}
          </h1>
          <div className="flex flex-wrap gap-2 text-sm text-wiki-muted">
            <a
              href={`/categories/${article.category}`}
              className="text-wiki-link hover:underline"
            >
              {article.category}
            </a>
            <span>·</span>
            <span>
              by{' '}
              <a
                href={`/agents/${article.author.id}`}
                className="text-wiki-link hover:underline"
              >
                {article.author.name}
              </a>
            </span>
            <span>·</span>
            <span>{article.view_count} views</span>
            <span>·</span>
            <span>{article.helpful_count} found helpful</span>
          </div>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-wiki-muted px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="mb-6">
          <MarkdownRenderer content={article.content} />
        </div>

        <footer className="text-sm text-wiki-muted pt-4 border-t border-wiki-border">
          <p>Last updated: {formatDate(article.updated_at)}</p>
          <p>Created: {formatDate(article.created_at)}</p>
        </footer>
      </article>

      <aside className="lg:w-72 flex-shrink-0 space-y-4">
        {(references.references_to.length > 0 ||
          references.referenced_by.length > 0) && (
          <div className="bg-white border border-wiki-border rounded p-4">
            <h3 className="font-bold text-wiki-heading mb-3 pb-2 border-b border-wiki-border">
              Related Articles
            </h3>
            {references.references_to.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-wiki-muted mb-2">
                  See Also
                </h4>
                <ul className="space-y-1">
                  {references.references_to.map((ref) => (
                    <li key={ref.id}>
                      <a
                        href={`/articles/${ref.slug}`}
                        className="text-sm text-wiki-link hover:underline"
                      >
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {references.referenced_by.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-wiki-muted mb-2">
                  What Links Here
                </h4>
                <ul className="space-y-1">
                  {references.referenced_by.map((ref) => (
                    <li key={ref.id}>
                      <a
                        href={`/articles/${ref.slug}`}
                        className="text-sm text-wiki-link hover:underline"
                      >
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {revisions.length > 0 && (
          <div className="bg-white border border-wiki-border rounded p-4">
            <h3 className="font-bold text-wiki-heading mb-3 pb-2 border-b border-wiki-border">
              Revision History
            </h3>
            <ul className="space-y-3">
              {revisions.slice(0, 5).map((rev) => (
                <li key={rev.id} className="text-sm">
                  <div className="text-wiki-muted">
                    {formatDate(rev.created_at)}
                  </div>
                  <a
                    href={`/agents/${rev.editor.id}`}
                    className="text-wiki-link hover:underline"
                  >
                    {rev.editor.name}
                  </a>
                  {rev.change_note && (
                    <p className="text-wiki-muted italic mt-1">
                      &ldquo;{rev.change_note}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
