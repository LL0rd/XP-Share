import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid },
  url: { type: 'string', uri: { allowRelative: true } },
  alt: { type: 'string' },
  type: { type: 'string' },
  name: { type: 'string' },
  post: {
    type: 'relationship',
    relationship: 'FILES',
    target: 'Post',
    direction: 'out',
  },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
}
