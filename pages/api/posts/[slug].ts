// pages/api/posts/[...slug].ts - API routes for posts
import { NextApiRequest, NextApiResponse } from 'next'
import { PayloadService } from '../../../lib/payload'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query
  const payloadService = await PayloadService.getInstance()

  try {
    if (!slug || slug.length === 0) {
      // GET /api/posts - List posts with pagination and filters
      const {
        page = '1',
        limit = '10',
        category,
        tag,
        type,
        search,
      } = req.query

      let posts

      if (search && typeof search === 'string') {
        posts = await payloadService.searchPosts(search, parseInt(limit as string))
      } else {
        posts = await payloadService.getPosts({
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          category: category as string,
          tag: tag as string,
          type: type as 'post' | 'page' | 'project',
        })
      }

      return res.status(200).json(posts)
    }

    if (slug.length === 1) {
      // GET /api/posts/[slug] - Get single post
      const post = await payloadService.getPostBySlug(slug[0] as string)
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }

      // Increment view count
      await payloadService.incrementViewCount(post.id)

      return res.status(200).json(post)
    }

    if (slug.length === 2 && slug[1] === 'related') {
      // GET /api/posts/[slug]/related - Get related posts
      const post = await payloadService.getPostBySlug(slug[0] as string)
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }

      const relatedPosts = await payloadService.getRelatedPosts(post.id)
      return res.status(200).json(relatedPosts)
    }

    return res.status(404).json({ error: 'Not found' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}