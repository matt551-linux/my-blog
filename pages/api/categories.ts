// pages/api/categories.ts - Categories API
import { NextApiRequest, NextApiResponse } from 'next'
import { PayloadService } from '../../lib/payload'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payloadService = await PayloadService.getInstance()

  try {
    const categories = await payloadService.getCategories()
    res.status(200).json(categories)
  } catch (error) {
    console.error('Categories API Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}