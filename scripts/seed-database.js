// scripts/seed-database.js - Sample data seeding
import { Pool } from 'pg';

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🌱 Seeding database with sample data...');

    // Create sample author
    const authorResult = await pool.query(`
      INSERT INTO authors (name, email, bio)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      'John Doe',
      'john@example.com',
      'A passionate writer and developer.'
    ]);
    
    const authorId = authorResult.rows[0].id;

    // Create sample categories
    const categories = [
      { name: 'Technology', slug: 'technology', color: '#3b82f6' },
      { name: 'Design', slug: 'design', color: '#8b5cf6' },
      { name: 'Business', slug: 'business', color: '#10b981' }
    ];

    const categoryIds = [];
    for (const category of categories) {
      const result = await pool.query(`
        INSERT INTO categories (name, slug, color)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [category.name, category.slug, category.color]);
      categoryIds.push(result.rows[0].id);
    }

    // Create sample tags
    const tags = [
      'javascript', 'react', 'nextjs', 'web-development', 
      'ui-ux', 'startup', 'productivity'
    ];

    const tagIds = [];
    for (const tag of tags) {
      const result = await pool.query(`
        INSERT INTO tags (name, slug)
        VALUES ($1, $2)
        RETURNING id
      `, [tag, tag]);
      tagIds.push(result.rows[0].id);
    }

    // Create sample posts
    const samplePosts = [
      {
        title: 'Getting Started with Next.js and Payload CMS',
        slug: 'getting-started-nextjs-payload',
        content: `# Getting Started with Next.js and Payload CMS

This is a comprehensive guide to building modern web applications using Next.js and Payload CMS.

## Why This Stack?

The combination of Next.js and Payload CMS offers several advantages:

- **Performance**: Next.js provides excellent performance with SSG and SSR
- **Developer Experience**: Great DX with hot reloading and TypeScript support
- **Content Management**: Payload CMS offers a flexible, code-first approach
- **Scalability**: Both technologies scale well for growing applications

## Getting Started

Let's walk through the setup process...`,
        excerpt: 'Learn how to build modern web applications using Next.js and Payload CMS.',
        status: 'published',
        type: 'post',
        publishedAt: new Date('2024-01-15'),
        authorId: authorId
      },
      {
        title: 'Advanced TypeScript Patterns',
        slug: 'advanced-typescript-patterns',
        content: `# Advanced TypeScript Patterns

TypeScript offers powerful features that can help you write more robust and maintainable code.

## Utility Types

TypeScript provides several utility types that can help you transform types:

\`\`\`typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};
\`\`\`

## Conditional Types

Conditional types allow you to choose types based on conditions...`,
        excerpt: 'Explore advanced TypeScript patterns and techniques for better code.',
        status: 'published',
        type: 'post',
        publishedAt: new Date('2024-01-10'),
        authorId: authorId
      },
      {
        title: 'About Us',
        slug: 'about',
        content: `# About Our Company

We are a team of passionate developers and designers who love creating amazing web experiences.

## Our Mission

Our mission is to help businesses succeed online by providing cutting-edge web solutions...`,
        excerpt: 'Learn more about our company and mission.',
        status: 'published',
        type: 'page',
        publishedAt: new Date('2024-01-01'),
        authorId: authorId
      }
    ];

    for (const [index, post] of samplePosts.entries()) {
      const postResult = await pool.query(`
        INSERT INTO posts (title, slug, content, excerpt, status, type, published_at, author_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        post.title,
        post.slug,
        post.content,
        post.excerpt,
        post.status,
        post.type,
        post.publishedAt,
        post.authorId
      ]);

      const postId = postResult.rows[0].id;

      // Add categories to posts
      if (index < 2) { // Only add to blog posts
        await pool.query(`
          INSERT INTO post_categories (post_id, category_id)
          VALUES ($1, $2)
        `, [postId, categoryIds[index]]);
      }

      // Add tags to posts
      const postTags = tagIds.slice(index * 2, (index * 2) + 2);
      for (const tagId of postTags) {
        await pool.query(`
          INSERT INTO post_tags (post_id, tag_id)
          VALUES ($1, $2)
        `, [postId, tagId]);
      }
    }

    console.log('✅ Sample data seeded successfully');
    console.log('🎉 Database seeding complete!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase().catch(console.error);