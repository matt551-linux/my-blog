// pages/index.tsx - Homepage
import { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { PayloadService } from '../lib/payload'
import { PostCard } from '../components/PostCard'
import { Post } from '../payload-types'

interface HomePageProps {
  posts: Post[]
  featuredPost: Post | null
}

export default function HomePage({ posts, featuredPost }: HomePageProps) {
  return (
    <>
      <Head>
        <title>My Blog - Home</title>
        <meta name="description" content="Welcome to my blog built with Next.js and Payload CMS" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {featuredPost && (
          <section className="mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
              <h1 className="text-4xl font-bold mb-4">Featured Post</h1>
              <h2 className="text-2xl font-semibold mb-4">
                <Link href={`/blog/${featuredPost.slug}`}>
                  {featuredPost.title}
                </Link>
              </h2>
              {featuredPost.excerpt && (
                <p className="text-lg mb-6 opacity-90">
                  {featuredPost.excerpt}
                </p>
              )}
              <Link 
                href={`/blog/${featuredPost.slug}`}
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Read More →
              </Link>
            </div>
          </section>
        )}

        {/* Recent Posts */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Recent Posts</h2>
            <Link 
              href="/blog"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Posts →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const payloadService = await PayloadService.getInstance()
    
    // Get recent posts
    const postsResult = await payloadService.getPosts({
      limit: 6,
      type: 'post'
    })
    
    // Get featured post (most recent with high view count or manually featured)
    const featuredResult = await payloadService.getPosts({
      limit: 1,
      type: 'post'
    })
    
    return {
      props: {
        posts: postsResult.docs,
        featuredPost: featuredResult.docs[0] || null,
      },
      revalidate: 60 * 10, // Revalidate every 10 minutes
    }
  } catch (error) {
    console.error('Error fetching homepage data:', error)
    return {
      props: {
        posts: [],
        featuredPost: null,
      },
      revalidate: 60,
    }
  }
}