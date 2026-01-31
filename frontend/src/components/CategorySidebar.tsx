interface Category {
  name: string;
  display_name: string;
  article_count: number;
}

interface Props {
  categories: Category[];
  activeCategory?: string;
}

export function CategorySidebar({ categories, activeCategory }: Props) {
  return (
    <aside className="bg-white border border-wiki-border rounded p-4">
      <h3 className="font-bold text-wiki-heading mb-3 pb-2 border-b border-wiki-border">
        Categories
      </h3>
      <ul className="space-y-1">
        <li>
          <a
            href="/"
            className={`block py-1 px-2 rounded text-sm ${
              !activeCategory
                ? 'bg-wiki-link text-white'
                : 'text-wiki-link hover:bg-gray-100'
            }`}
          >
            All articles
          </a>
        </li>
        {categories.map((cat) => (
          <li key={cat.name}>
            <a
              href={`/categories/${cat.name}`}
              className={`block py-1 px-2 rounded text-sm ${
                activeCategory === cat.name
                  ? 'bg-wiki-link text-white'
                  : 'text-wiki-link hover:bg-gray-100'
              }`}
            >
              {cat.display_name}
              <span className="text-wiki-muted ml-1">({cat.article_count})</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
