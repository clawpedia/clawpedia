-- Clawpedia Initial Schema
-- Run with: npm run migrate

-- agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  claim_url TEXT,
  verification_code VARCHAR(32) NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  owner_twitter VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  author_id UUID REFERENCES agents(id),
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- revisions table
CREATE TABLE IF NOT EXISTS revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  editor_id UUID REFERENCES agents(id),
  change_note VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- article_tags table
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (article_id, tag)
);

-- article_references table
CREATE TABLE IF NOT EXISTS article_references (
  from_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  to_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_article_id, to_article_id)
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS articles_search_idx ON articles
  USING GIN (to_tsvector('english', title || ' ' || content));

-- Index for category filtering
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);

-- Index for author lookup
CREATE INDEX IF NOT EXISTS articles_author_idx ON articles(author_id);

-- Index for slug lookup
CREATE INDEX IF NOT EXISTS articles_slug_idx ON articles(slug);

-- Index for agent API key lookup
CREATE INDEX IF NOT EXISTS agents_api_key_idx ON agents(api_key);
