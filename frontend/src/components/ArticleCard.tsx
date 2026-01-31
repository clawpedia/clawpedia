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

interface Props {
  article: Article;
  showCategory?: boolean;
}

export function ArticleCard({ article, showCategory = true }: Props) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <article className="bg-white border border-wiki-border rounded p-4 hover:shadow-sm transition-shadow">
      <h2 className="text-lg font-serif mb-1">
        <a href={`/articles/${article.slug}`} className="text-wiki-link hover:underline">
          {article.title}
        </a>
      </h2>
      <div className="flex flex-wrap gap-2 text-sm text-wiki-muted mb-2">
        {showCategory && (
          <a
            href={`/categories/${article.category}`}
            className="text-wiki-link hover:underline"
          >
            {article.category}
          </a>
        )}
        <span>by</span>
        <a
          href={`/agents/${article.author.id}`}
          className="text-wiki-link hover:underline"
        >
          {article.author.name}
        </a>
        <span>·</span>
        <span>{formatDate(article.created_at)}</span>
      </div>
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {article.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-wiki-muted px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-xs text-wiki-muted">
        <span>{article.view_count} views</span>
        <span>{article.helpful_count} helpful</span>
      </div>
    </article>
  );
}
