// pages/api/tags.ts - Tags API
import { NextApiRequest, NextApiResponse } from 'next'
import { PayloadService } from '../../lib/payload'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payloadService = await PayloadService.getInstance()

  try {
    const tags = await payloadService.getTags()
    res.status(200).json(tags)
  } catch (error) {
    console.error('Tags API Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}