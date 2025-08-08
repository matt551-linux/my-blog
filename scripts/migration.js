// scripts/migration.js (Enhanced version with better error handling)
// This is the same as the previous migration script but with additional features

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Pool } from 'pg';
import slugify from 'slugify';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration with environment variable support
const config = {
  contentDir: process.env.CONTENT_DIR || './content',
  imageDir: process.env.IMAGE_DIR || './static/images',
  batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE) || 10,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  skipExisting: process.argv.includes('--skip-existing'),
};

class EnhancedContentMigrator {
  constructor() {
    this.stats = {
      processed: 0,
      errors: 0,
      skipped: 0,
      categories: new Set(),
      tags: new Set(),
      errors_details: []
    };
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async migrate() {
    console.log('🚀 Starting enhanced content migration...');
    console.log(`📁 Content directory: ${config.contentDir}`);
    console.log(`🔧 Dry run: ${config.dryRun}`);
    console.log(`📊 Batch size: ${config.batchSize}`);
    
    try {
      await this.validateEnvironment();
      await this.setupDatabase();
      await this.migrateContent();
      await this.migrateTaxonomies();
      await this.linkPostsToTaxonomies();
      await this.printDetailedStats();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      await fs.access(config.contentDir);
    } catch {
      throw new Error(`Content directory not found: ${config.contentDir}`);
    }

    // Test database connection
    await this.pool.query('SELECT NOW()');
    console.log('✅ Environment validation passed');
  }

  async setupDatabase() {
    console.log('📋 Setting up database tables...');
    
    if (config.dryRun) {
      console.log('🧪 Dry run mode - skipping database setup');
      return;
    }

    // Check if required tables exist
    const tables = ['posts', 'categories', 'tags', 'authors'];
    const existingTables = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1)
    `, [tables]);

    const existing = existingTables.rows.map(row => row.table_name);
    const missing = tables.filter(table => !existing.includes(table));

    if (missing.length > 0) {
      console.log(`⚠️  Missing tables: ${missing.join(', ')}`);
      console.log('Please run the schema setup script first: npm run db:setup');
      throw new Error('Database not properly initialized');
    }

    console.log('✅ Database tables verified');
  }

  async linkPostsToTaxonomies() {
    if (config.dryRun) {
      console.log('🧪 Dry run mode - skipping taxonomy linking');
      return;
    }

    console.log('🔗 Linking posts to categories and tags...');

    // Get all posts with their frontmatter
    const posts = await this.pool.query(`
      SELECT id, slug, frontmatter 
      FROM posts 
      WHERE frontmatter IS NOT NULL
    `);

    for (const post of posts.rows) {
      try {
        const frontmatter = typeof post.frontmatter === 'string' 
          ? JSON.parse(post.frontmatter) 
          : post.frontmatter;

        // Link categories
        const categories = this.extractTaxonomy(frontmatter.categories || frontmatter.category);
        for (const categoryName of categories) {
          const categorySlug = slugify(categoryName, { lower: true, strict: true });
          const categoryResult = await this.pool.query(
            'SELECT id FROM categories WHERE slug = $1',
            [categorySlug]
          );

          if (categoryResult.rows.length > 0) {
            await this.pool.query(`
              INSERT INTO post_categories (post_id, category_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [post.id, categoryResult.rows[0].id]);
          }
        }

        // Link tags
        const tags = this.extractTaxonomy(frontmatter.tags || frontmatter.tag);
        for (const tagName of tags) {
          const tagSlug = slugify(tagName, { lower: true, strict: true });
          const tagResult = await this.pool.query(
            'SELECT id FROM tags WHERE slug = $1',
            [tagSlug]
          );

          if (tagResult.rows.length > 0) {
            await this.pool.query(`
              INSERT INTO post_tags (post_id, tag_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [post.id, tagResult.rows[0].id]);
          }
        }

        if (config.verbose) {
          console.log(`✅ Linked taxonomies for post: ${post.slug}`);
        }

      } catch (error) {
        console.error(`❌ Error linking taxonomies for post ${post.slug}:`, error.message);
      }
    }

    console.log('✅ Taxonomy linking complete');
  }

  async getMarkdownFiles() {
    const files = [];
    
    async function walkDir(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await walkDir(fullPath);
          } else if (entry.name.match(/\.(md|mdx)$/)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not read directory ${dir}: ${error.message}`);
      }
    }
    
    await walkDir(config.contentDir);
    return files;
  }

  async processFile(filePath) {
    try {
      if (config.verbose) {
        console.log(`Processing: ${filePath}`);
      }
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      // Generate slug from filename or frontmatter
      const slug = this.generateSlug(frontmatter, filePath);
      
      // Check if post already exists and skip if requested
      if (config.skipExisting && !config.dryRun) {
        const existing = await this.pool.query(
          'SELECT id FROM posts WHERE slug = $1',
          [slug]
        );
        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping existing post: ${slug}`);
          this.stats.skipped++;
          return;
        }
      }

      // Extract and clean content
      const cleanContent = this.cleanContent(content);
      
      // Determine post type and status
      const type = this.determinePostType(filePath, frontmatter);
      const status = this.determineStatus(frontmatter);
      
      // Process dates
      const publishedAt = this.parseDate(frontmatter.date || frontmatter.published || frontmatter.publishedAt);
      
      // Extract categories and tags
      const categories = this.extractTaxonomy(frontmatter.categories || frontmatter.category);
      const tags = this.extractTaxonomy(frontmatter.tags || frontmatter.tag);
      
      // Add to our tracking sets
      categories.forEach(cat => this.stats.categories.add(cat));
      tags.forEach(tag => this.stats.tags.add(tag));
      
      if (!config.dryRun) {
        await this.insertPost({
          slug,
          title: frontmatter.title || this.generateTitleFromPath(filePath),
          content: cleanContent,
          excerpt: frontmatter.excerpt || frontmatter.description || this.generateExcerpt(cleanContent),
          metaDescription: frontmatter.metaDescription || frontmatter.meta_description,
          featuredImage: this.processFeaturedImage(frontmatter.image || frontmatter.featured_image),
          publishedAt,
          status,
          type,
          frontmatter: frontmatter,
          originalPath: filePath
        });
      }
      
      this.stats.processed++;
      
    } catch (error) {
      const errorDetail = {
        file: filePath,
        error: error.message,
        stack: error.stack
      };
      this.stats.errors_details.push(errorDetail);
      console.error(`❌ Error processing ${filePath}:`, error.message);
      this.stats.errors++;
    }
  }

  generateSlug(frontmatter, filePath) {
    if (frontmatter.slug) return frontmatter.slug;
    
    // Extract filename without extension
    const filename = path.basename(filePath, path.extname(filePath));
    
    // Remove date prefixes (e.g., "2023-01-01-title" -> "title")
    const withoutDate = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    
    return slugify(withoutDate, { lower: true, strict: true });
  }

  cleanContent(content) {
    // Remove common markdown artifacts that might cause issues
    return content
      .replace(/^\s*---[\s\S]*?---\s*/m, '') // Remove any remaining frontmatter
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();
  }

  determinePostType(filePath, frontmatter) {
    if (frontmatter.type) return frontmatter.type;
    
    // Determine from file path
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('/pages/') || pathLower.includes('page')) return 'page';
    if (pathLower.includes('/projects/') || pathLower.includes('project')) return 'project';
    return 'post';
  }

  determineStatus(frontmatter) {
    if (frontmatter.draft === true || frontmatter.status === 'draft') return 'draft';
    if (frontmatter.published === false) return 'draft';
    if (frontmatter.status === 'archived') return 'archived';
    return 'published';
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  extractTaxonomy(taxonomy) {
    if (!taxonomy) return [];
    if (Array.isArray(taxonomy)) return taxonomy.filter(Boolean);
    if (typeof taxonomy === 'string') {
      return taxonomy.split(/[,;]/).map(item => item.trim()).filter(Boolean);
    }
    return [];
  }

  generateTitleFromPath(filePath) {
    const filename = path.basename(filePath, path.extname(filePath));
    const withoutDate = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return withoutDate
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  generateExcerpt(content, maxLength = 160) {
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/[#*>`]/g, '') // Remove remaining markdown chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (plainText.length <= maxLength) return plainText;
    
    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  processFeaturedImage(imagePath) {
    if (!imagePath) return null;
    
    // Convert relative paths to absolute if needed
    if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
      return imagePath.replace(/^\.\.?\//, '/');
    }
    
    if (imagePath.startsWith('/')) {
      return imagePath;
    }
    
    // Assume it's a relative path from images directory
    return `/images/${imagePath}`;
  }

  async insertPost(postData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert or update the post
      const postResult = await client.query(`
        INSERT INTO posts (
          slug, title, content, excerpt, meta_description, featured_image,
          published_at, status, type, frontmatter
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          excerpt = EXCLUDED.excerpt,
          meta_description = EXCLUDED.meta_description,
          featured_image = EXCLUDED.featured_image,
          published_at = EXCLUDED.published_at,
          status = EXCLUDED.status,
          type = EXCLUDED.type,
          frontmatter = EXCLUDED.frontmatter,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        postData.slug,
        postData.title,
        postData.content,
        postData.excerpt,
        postData.metaDescription,
        postData.featuredImage,
        postData.publishedAt,
        postData.status,
        postData.type,
        JSON.stringify({
          ...postData.frontmatter,
          _migration: {
            originalPath: postData.originalPath,
            migratedAt: new Date().toISOString()
          }
        })
      ]);
      
      await client.query('COMMIT');
      
      if (config.verbose) {
        console.log(`✅ Inserted/updated post: ${postData.slug}`);
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to insert post ${postData.slug}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async migrateContent() {
    console.log('📄 Migrating content files...');
    
    const files = await this.getMarkdownFiles();
    console.log(`Found ${files.length} markdown files`);

    if (files.length === 0) {
      console.log('⚠️  No markdown files found to migrate');
      return;
    }

    // Process files in batches
    for (let i = 0; i < files.length; i += config.batchSize) {
      const batch = files.slice(i, i + config.batchSize);
      await Promise.all(batch.map(file => this.processFile(file)));
      console.log(`Processed ${Math.min(i + config.batchSize, files.length)}/${files.length} files`);
    }
  }

  async migrateTaxonomies() {
    console.log('🏷️  Migrating categories and tags...');
    
    if (config.dryRun) {
      console.log('🧪 Dry run mode - would create:');
      console.log(`Categories: ${Array.from(this.stats.categories).join(', ')}`);
      console.log(`Tags: ${Array.from(this.stats.tags).join(', ')}`);
      return;
    }

    // Insert categories
    for (const categoryName of this.stats.categories) {
      try {
        await this.pool.query(`
          INSERT INTO categories (name, slug, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (slug) DO NOTHING
        `, [
          categoryName, 
          slugify(categoryName, { lower: true, strict: true }),
          `Auto-generated category for ${categoryName}`
        ]);
      } catch (error) {
        console.error(`❌ Error creating category ${categoryName}:`, error.message);
      }
    }

    // Insert tags
    for (const tagName of this.stats.tags) {
      try {
        await this.pool.query(`
          INSERT INTO tags (name, slug)
          VALUES ($1, $2)
          ON CONFLICT (slug) DO NOTHING
        `, [tagName, slugify(tagName, { lower: true, strict: true })]);
      } catch (error) {
        console.error(`❌ Error creating tag ${tagName}:`, error.message);
      }
    }

    console.log(`✅ Created ${this.stats.categories.size} categories and ${this.stats.tags.size} tags`);
  }

  async printDetailedStats() {
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Processed: ${this.stats.processed}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`📁 Categories: ${this.stats.categories.size}`);
    console.log(`🏷️  Tags: ${this.stats.tags.size}`);

    if (this.stats.errors > 0 && config.verbose) {
      console.log('\n❌ Error Details:');
      this.stats.errors_details.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}`);
        console.log(`   Error: ${error.error}`);
      });
    }

    if (config.dryRun) {
      console.log('\n🧪 This was a dry run. No changes were made to the database.');
      console.log('   Run without --dry-run to perform the actual migration.');
    }
  }
}

// Enhanced main function with better CLI handling
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Content Migration Tool

Usage: node scripts/migration.js [options]

Options:
  --dry-run          Run without making database changes
  --verbose          Show detailed output
  --skip-existing    Skip posts that already exist in database
  --help, -h         Show this help message

Environment Variables:
  DATABASE_URL              NeonDB connection string (required)
  CONTENT_DIR              Content directory path (default: ./content)
  IMAGE_DIR                Images directory path (default: ./static/images)
  MIGRATION_BATCH_SIZE     Batch size for processing (default: 10)

Examples:
  npm run migrate                    # Run migration
  npm run migrate:dry-run            # Test migration without changes
  node scripts/migration.js --verbose --skip-existing
    `);
    process.exit(0);
  }

  try {
    const migrator = new EnhancedContentMigrator();
    await migrator.migrate();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}