// payload.config.ts - Complete Payload CMS configuration
import { buildConfig } from 'payload/config'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { webpackBundler } from '@payloadcms/bundler-webpack'
import { slateEditor } from '@payloadcms/richtext-slate'
import path from 'path'

// Import collections
import { Posts } from './collections/Posts'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { Authors } from './collections/Authors'
import { Media } from './collections/Media'

export default buildConfig({
  admin: {
    user: 'users', // We'll create this collection
    bundler: webpackBundler(),
  },
  editor: slateEditor({}),
  collections: [
    Posts,
    Categories,
    Tags,
    Authors,
    Media,
    // Users collection for admin authentication
    {
      slug: 'users',
      auth: true,
      admin: {
        useAsTitle: 'email',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  cors: [
    process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3001', // Your Next.js frontend
  ].filter(Boolean),
  csrf: [
    process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ].filter(Boolean),
})
