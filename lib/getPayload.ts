// lib/getPayload.ts - Payload client initialization
import { Payload } from 'payload'
import config from '../payload.config'

let cached = (global as any).payload

if (!cached) {
  cached = (global as any).payload = { client: null, promise: null }
}

export const getPayloadClient = async (): Promise<Payload> => {
  if (cached.client) {
    return cached.client
  }

  if (!cached.promise) {
    cached.promise = initPayload()
  }

  try {
    cached.client = await cached.promise
  } catch (e: unknown) {
    cached.promise = null
    throw e
  }

  return cached.client
}

const initPayload = async (): Promise<Payload> => {
  const payload = await import('payload')
  
  await payload.init({
    ...config,
    local: true, // Important for Next.js integration
  })

  return payload.default
}