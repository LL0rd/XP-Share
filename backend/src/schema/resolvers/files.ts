import { getNeode } from '../../db/neo4j'
import Resolver from './helpers/Resolver'
import { deleteFile } from './files/files'

const neode = getNeode()

export default {
  Mutation: {
    DeleteFile: async (object, { id }, context, resolveInfo) => {
      const file = await neode.find('File', id)
      if (!file) return null
      await file.delete()
      await deleteFile(file)
      return file.toJson()
    },
  },
  Comment: {
    ...Resolver('File', {
      hasOne: {
        post: '-[:COMMENTS]->(related:Post)',
      },
    }),
  },
}
