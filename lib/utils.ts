// lib/utils.ts - Utility functions
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function generateExcerpt(content: string, maxLength = 160): string {
  // Strip HTML/markdown and truncate
  const plainText = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .trim()

  if (plainText.length <= maxLength) return plainText
  
  return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

export function getPostUrl(post: Post): string {
  return post.type === 'page' ? `/${post.slug}` : `/blog/${post.slug}`
}