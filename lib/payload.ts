// lib/payload.ts - Payload client configuration
import { getPayloadClient } from './getPayload'
import { Post, Category, Tag, Author } from '../payload-types'

export class PayloadService {
  private static instance: PayloadService
  private payload: any

  private constructor() {}

  static async getInstance() {
    if (!PayloadService.instance) {
      PayloadService.instance = new PayloadService()
      PayloadService.instance.payload = await getPayloadClient()
    }
    return PayloadService.instance
  }

  // Posts methods
  async getPosts(options: {
    page?: number
    limit?: number
    status?: 'published' | 'draft'
    type?: 'post' | 'page' | 'project'
    category?: string
    tag?: string
  } = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'published',
      type,
      category,
      tag
    } = options

    const where: any = { status: { equals: status } }

    if (type) {
      where.type = { equals: type }
    }

    if (category) {
      where['categories.slug'] = { equals: category }
    }

    if (tag) {
      where['tags.slug'] = { equals: tag }
    }

    const result = await this.payload.find({
      collection: 'posts',
      where,
      page,
      limit,
      sort: '-publishedAt',
      populate: {
        author: true,
        categories: true,
        tags: true,
        featuredImage: true,
      },
    })

    return result
  }

  async getPostBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'posts',
      where: {
        slug: { equals: slug },
      },
      limit: 1,
      populate: {
        author: true,
        categories: true,
        tags: true,
        featuredImage: true,
      },
    })

    return result.docs[0] || null
  }

  async getPostById(id: string) {
    return await this.payload.findByID({
      collection: 'posts',
      id,
      populate: {
        author: true,
        categories: true,
        tags: true,
        featuredImage: true,
      },
    })
  }

  async getRelatedPosts(postId: string, limit = 3) {
    const post = await this.getPostById(postId)
    if (!post) return []

    const categoryIds = post.categories?.map((cat: any) => cat.id) || []
    const tagIds = post.tags?.map((tag: any) => tag.id) || []

    const result = await this.payload.find({
      collection: 'posts',
      where: {
        and: [
          { id: { not_equals: postId } },
          { status: { equals: 'published' } },
          {
            or: [
              { 'categories.id': { in: categoryIds } },
              { 'tags.id': { in: tagIds } },
            ],
          },
        ],
      },
      limit,
      sort: '-publishedAt',
      populate: {
        featuredImage: true,
        categories: true,
      },
    })

    return result.docs
  }

  // Categories methods
  async getCategories() {
    const result = await this.payload.find({
      collection: 'categories',
      sort: 'name',
    })
    return result.docs
  }

  async getCategoryBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return result.docs[0] || null
  }

  // Tags methods
  async getTags() {
    const result = await this.payload.find({
      collection: 'tags',
      sort: 'name',
    })
    return result.docs
  }

  async getTagBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'tags',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return result.docs[0] || null
  }

  // Search functionality
  async searchPosts(query: string, limit = 10) {
    const result = await this.payload.find({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          {
            or: [
              { title: { contains: query } },
              { content: { contains: query } },
              { excerpt: { contains: query } },
            ],
          },
        ],
      },
      limit,
      sort: '-publishedAt',
      populate: {
        featuredImage: true,
        categories: true,
      },
    })
    return result.docs
  }

  // Analytics
  async incrementViewCount(postId: string) {
    const post = await this.getPostById(postId)
    if (!post) return

    await this.payload.update({
      collection: 'posts',
      id: postId,
      data: {
        viewCount: (post.viewCount || 0) + 1,
      },
    })
  }
}
