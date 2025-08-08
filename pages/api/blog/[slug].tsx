// pages/blog/[slug].tsx - Individual blog post page
import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { PayloadService } from '../../lib/payload'
import { PostCard } from '../../components/PostCard'
import { formatDate } from '../../lib/utils'
import { Post } from '../../payload-types'

interface BlogPostPageProps {
  post: Post
  relatedPosts: Post[]
}

export default function BlogPostPage({ post, relatedPosts }: BlogPostPageProps) {
  if (!post) {
    return <div>Post not found</div>
  }

  return (
    <>
      <Head>
        <title>{post.seo?.title || post.title}</title>
        <meta 
          name="description" 
          content={post.seo?.description || post.metaDescription || post.excerpt} 
        />
        {post.seo?.keywords && (
          <meta name="keywords" content={post.seo.keywords} />
        )}
        
        {/* Open Graph tags */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ''} />
        <meta property="og:type" content="article" />
        {post.featuredImage && typeof post.featuredImage === 'object' && (
          <meta property="og:image" content={post.featuredImage.url!} />
        )}
      </Head>

      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          {post.categories && post.categories.length > 0 && (
            <div className="mb-4">
              {post.categories.map((category: any) => (
                <Link 
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mr-2 mb-2"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <p className="text-lg text-gray-600 mb-6">
            Published on {formatDate(post.publishedAt)} by{' '}
            <Link 
              href={`/author/${post.author?.slug}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {post.author?.name}
            </Link>
          </p>
        </header>

        {/* Featured Image */}
        {post.featuredImage && typeof post.featuredImage === 'object' && (
          <div className="mb-8">
            <Image 
              src={post.featuredImage.url!}
              alt={post.featuredImage.alt || post.title}
              width={post.featuredImage.width}
              height={post.featuredImage.height}
              className="rounded-lg"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-4">Related Posts</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost) => (
                <li key={relatedPost.id}>
                  <PostCard post={relatedPost} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const service = new PayloadService('posts')
  const posts = await service.find({
    where: {
      status: 'published',
    },
    select: ['slug'],
  })

  return {
    paths: posts.map((post) => ({
      params: {
        slug: post.slug,
      },
    })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const service = new PayloadService('posts')
  const post = await service.findOne({
    where: {
      slug: params?.slug,
    },
    populate: ['categories', 'tags', 'author', 'featuredImage'],
  })

  if (!post) {
    return {
      notFound: true,
    }
  }

  const relatedPosts = await service.find({
    where: {
      status: 'published',
      categories: {
        some: {
          id: { in: post.categories.map((category) => category.id) },
        },
      },
      id: { neq: post.id },
    },
    select: ['id', 'title', 'slug', 'excerpt', 'publishedAt', 'categories', 'tags'],
    limit: 3,
  })

  return {
    props: {
      post,
      relatedPosts,
    },
  }
}
