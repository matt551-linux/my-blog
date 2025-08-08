// hooks/usePosts.ts - Custom React hook for posts
import { useState, useEffect } from 'react'
import { Post } from '../payload-types'

interface UsePostsOptions {
  page?: number
  limit?: number
  category?: string
  tag?: string
  type?: string
  search?: string
}

interface UsePostsReturn {
  posts: Post[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalPages: number
  loadMore: () => void
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(0)

  const {
    page = 1,
    limit = 10,
    category,
    tag,
    type,
    search
  } = options

  useEffect(() => {
    fetchPosts()
  }, [page, limit, category, tag, type, search])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      if (category) params.append('category', category)
      if (tag) params.append('tag', tag)
      if (type) params.append('type', type)
      if (search) params.append('search', search)

      const response = await fetch(`/api/posts?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts')
      }

      if (page === 1) {
        setPosts(data.docs)
      } else {
        setPosts(prev => [...prev, ...data.docs])
      }

      setHasMore(data.hasNextPage)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      // This would typically update the page state to trigger useEffect
      // Implementation depends on how you handle pagination
    }
  }

  return {
    posts,
    loading,
    error,
    hasMore,
    totalPages,
    loadMore
  }
}
  