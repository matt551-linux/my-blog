// collections/Posts.ts - Posts collection configuration
import { CollectionConfig } from 'payload/types'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt', 'updatedAt'],
    preview: (doc) => `${process.env.FRONTEND_URL}/${doc.type === 'page' ? '' : 'blog/'}${doc.slug}`,
  },
  versions: {
    drafts: true,
  },
  access: {
    read: () => true, // Public read access
    create: () => true, // Adjust based on your auth needs
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'The title of your post/page',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the title',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data?.title && !data.slug) {
              return data.title
                .toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '');
            }
            return data?.slug;
          },
        ],
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      admin: {
        description: 'The main content of your post/page',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Brief summary for previews and SEO',
      },
    },
    {
      name: 'metaDescription',
      type: 'text',
      admin: {
        description: 'SEO meta description',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Featured image for the post',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When this post was/will be published',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Published',
          value: 'published',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
      defaultValue: 'draft',
      admin: {
        description: 'Publication status',
      },
    },
    {
      name: 'type',
      type: 'select',
      options: [
        {
          label: 'Blog Post',
          value: 'post',
        },
        {
          label: 'Page',
          value: 'page',
        },
        {
          label: 'Project',
          value: 'project',
        },
      ],
      defaultValue: 'post',
      admin: {
        description: 'Type of content',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      admin: {
        description: 'Author of this post',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description: 'Categories for this post',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        description: 'Tags for this post',
      },
    },
    {
      name: 'viewCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Number of views',
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO Settings',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'Override the page title for SEO',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Override meta description for SEO',
          },
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'SEO keywords (comma-separated)',
          },
        },
      ],
    },
    // Store original frontmatter for reference
    {
      name: 'originalFrontmatter',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Original markdown frontmatter (for reference)',
        condition: (data) => Boolean(data?.originalFrontmatter),
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Auto-set publishedAt if status changes to published
        if (data.status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date();
        }
        return data;
      },
    ],
  },
}