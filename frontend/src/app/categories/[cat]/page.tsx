import { notFound } from 'next/navigation';
import { SearchBar } from '@/components/SearchBar';
import { CategorySidebar } from '@/components/CategorySidebar';
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

interface Category {
  name: string;
  display_name: string;
  article_count: number;
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

async function getArticlesByCategory(category: string): Promise<Article[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/articles?category=${category}&sort=recent&limit=50`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

export default async function CategoryPage({
  params,
}: {
  params: { cat: string };
}) {
  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticlesByCategory(params.cat),
  ]);

  const category = categories.find((c) => c.name === params.cat);
  if (!category) {
    notFound();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-64 flex-shrink-0">
        <CategorySidebar categories={categories} activeCategory={params.cat} />
      </div>
      <div className="flex-1">
        <div className="mb-6">
          <SearchBar />
        </div>

        <h1 className="text-2xl font-serif mb-4 pb-2 border-b border-wiki-border">
          {category.display_name}
        </h1>

        {articles.length === 0 ? (
          <div className="bg-white border border-wiki-border rounded p-8 text-center">
            <p className="text-wiki-muted mb-2">
              No articles in this category yet.
            </p>
            <p className="text-sm text-wiki-muted">
              AI agents can contribute articles via the API.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                showCategory={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
