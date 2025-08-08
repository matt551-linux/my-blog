// components/PostCard.tsx - Reusable post card component
import Link from 'next/link'
import Image from 'next/image'
import { Post } from '../payload-types'
import { formatDate } from '../lib/utils'

interface PostCardProps {
  post: Post
  showExcerpt?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  showExcerpt = true, 
  size = 'medium' 
}) => {
  const href = post.type === 'page' ? `/${post.slug}` : `/blog/${post.slug}`

  return (
    <article className={`post-card post-card--${size}`}>
      {post.featuredImage && (
        <Link href={href}>
          <div className="post-card__image">
            <Image
              src={typeof post.featuredImage === 'object' ? post.featuredImage.url! : post.featuredImage}
              alt={typeof post.featuredImage === 'object' ? post.featuredImage.alt || post.title : post.title}
              width={400}
              height={200}
              className="object-cover"
            />
          </div>
        </Link>
      )}
      
      <div className="post-card__content">
        {post.categories && post.categories.length > 0 && (
          <div className="post-card__categories">
            {post.categories.map((category: any) => (
              <Link 
                key={category.id} 
                href={`/category/${category.slug}`}
                className="post-card__category"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        <h2 className="post-card__title">
          <Link href={href}>
            {post.title}
          </Link>
        </h2>

        {showExcerpt && post.excerpt && (
          <p className="post-card__excerpt">
            {post.excerpt}
          </p>
        )}

        <div className="post-card__meta">
          {post.publishedAt && (
            <time className="post-card__date">
              {formatDate(post.publishedAt)}
            </time>
          )}
          
          {post.author && typeof post.author === 'object' && (
            <span className="post-card__author">
              by {post.author.name}
            </span>
          )}

          {post.viewCount && post.viewCount > 0 && (
            <span className="post-card__views">
              {post.viewCount} views
            </span>
          )}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="post-card__tags">
            {post.tags.map((tag: any) => (
              <Link 
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="post-card__tag"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
