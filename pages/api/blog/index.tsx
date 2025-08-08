// pages/blog/index.tsx - Blog listing page
import { GetStaticProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { PayloadService } from '../../lib/payload'
import { PostCard } from '../../components/PostCard'
import { Post, Category, Tag } from '../../payload-types'

interface BlogPageProps {
  posts: Post[]
  categories: Category[]
  tags: Tag[]
  pagination: {
    totalPages: number
    page: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function BlogPage({ posts, categories, tags, pagination }: BlogPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')

  return (
    <>
      <Head>
        <title>Blog - All Posts</title>
        <meta name="description" content="Browse all blog posts" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Blog Posts</h1>
          <p className="text-gray-600 text-lg">
            Exploring technology, design, and development
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tag
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    #{tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            {pagination.hasPrevPage && (
              <Link 
                href={`/blog?page=${pagination.page - 1}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Previous
              </Link>
            )}
            
            <span className="px-4 py-2 bg-gray-100 rounded-lg">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            {pagination.hasNextPage && (
              <Link 
                href={`/blog?page=${pagination.page + 1}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </Link>
            )}
          </div>
        )}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No posts found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or check back later for new content.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ query }) => {
  try {
    const payloadService = await PayloadService.getInstance()
    const page = parseInt(query?.page as string) || 1
    const limit = 12

    // Get posts with pagination
    const postsResult = await payloadService.getPosts({
      page,
      limit,
      type: 'post'
    })

    // Get categories and tags for filters
    const [categories, tags] = await Promise.all([
      payloadService.getCategories(),
      payloadService.getTags()
    ])

    return {
      props: {
        posts: postsResult.docs,
        categories,
        tags,
        pagination: {
          totalPages: postsResult.totalPages,
          page: postsResult.page,
          hasNextPage: postsResult.hasNextPage,
          hasPrevPage: postsResult.hasPrevPage,
        }
      },
      revalidate: 60 * 5, // Revalidate every 5 minutes
    }
  } catch (error) {
    console.error('Error fetching blog page data:', error)
    return {
      props: {
        posts: [],
        categories: [],
        tags: [],
        pagination: {
          totalPages: 0,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        }
      },
      revalidate: 60,
    }
  }
}
