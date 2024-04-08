import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid },
  url: { type: 'string', uri: { allowRelative: true } },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
}
