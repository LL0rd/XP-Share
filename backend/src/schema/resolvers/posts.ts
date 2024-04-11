import { v4 as uuid } from 'uuid'
import { neo4jgraphql } from 'neo4j-graphql-js'
import { isEmpty } from 'lodash'
import { UserInputError } from 'apollo-server'
import { mergeImage, deleteImage } from './images/images'
import { mergeDrawing, deleteDrawing } from './images/drawings'
import { uploadFile, deleteFile } from './files/files'
import Resolver from './helpers/Resolver'
import { filterForMutedUsers } from './helpers/filterForMutedUsers'
import { filterInvisiblePosts } from './helpers/filterInvisiblePosts'
import { filterPostsOfMyGroups } from './helpers/filterPostsOfMyGroups'
import { validateEventParams } from './helpers/events'
import { createOrUpdateLocations } from './users/location'
import CONFIG from '../../config'

const maintainPinnedPosts = (params) => {
  const pinnedPostFilter = { pinned: true }
  if (isEmpty(params.filter)) {
    params.filter = { OR: [pinnedPostFilter, {}] }
  } else {
    params.filter = { OR: [pinnedPostFilter, { ...params.filter }] }
  }
  return params
}

const filterEventDates = (params) => {
  if (params.filter?.eventStart_gte) {
    const date = params.filter.eventStart_gte
    delete params.filter.eventStart_gte
    params.filter = { ...params.filter, OR: [{ eventStart_gte: date }, { eventEnd_gte: date }] }
  }
  return params
}

export default {
  Query: {
    Post: async (object, params, context, resolveInfo) => {
      params = await filterPostsOfMyGroups(params, context)
      params = await filterInvisiblePosts(params, context)
      params = await filterForMutedUsers(params, context)
      params = filterEventDates(params)
      params = await maintainPinnedPosts(params)

      let result = await neo4jgraphql(object, params, context, resolveInfo, false);

      if (Array.isArray(result)) {
        result = result.filter(post => {
          if (post.isPrivate && !(context.user.role === 'admin' || post.author.id === context.user.id)) {
            return false;
          }

          if (post.isAno && !(context.user.role === 'admin' || post.author.id === context.user.id)) {
            post.author = null;
          }

          return post;
        });
      } else if (result) {
        if (result.isPrivate && !(context.user.role === 'admin' || result.author.id === context.user.id)) {
          return null;
        } else if (result.isAno && !(context.user.role === 'admin' || result.author.id === context.user.id)) {
          result.author = null;
        }
      }

      return result;
    },
    profilePagePosts: async (object, params, context, resolveInfo) => {
      params = await filterPostsOfMyGroups(params, context)
      params = await filterInvisiblePosts(params, context)
      params = await filterForMutedUsers(params, context)
      let result = await neo4jgraphql(object, params, context, resolveInfo, false);

      if (Array.isArray(result)) {
        result = result.filter(post => {
          if (post.isPrivate && !(context.user.role === 'admin' || post.author.id === context.user.id)) {
            return false;
          }

          if (post.isAno && !(context.user.role === 'admin' || post.author.id === context.user.id)) {
            post.author = null;
          }

          return post;
        });
      } else if (result) {
        if (result.isPrivate && !(context.user.role === 'admin' || result.author.id === context.user.id)) {
          return null;
        } else if (result.isAno && !(context.user.role === 'admin' || result.author.id === context.user.id)) {
          result.author = null;
        }
      }

      return result;
    },
    PostsEmotionsCountByEmotion: async (object, params, context, resolveInfo) => {
      const { postId, data } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (transaction) => {
        const emotionsCountTransactionResponse = await transaction.run(
          `
            MATCH (post:Post {id: $postId})<-[emoted:EMOTED {emotion: $data.emotion}]-()
            RETURN COUNT(DISTINCT emoted) as emotionsCount
          `,
          { postId, data },
        )
        return emotionsCountTransactionResponse.records.map(
          (record) => record.get('emotionsCount').low,
        )
      })
      try {
        const [emotionsCount] = await readTxResultPromise
        return emotionsCount
      } finally {
        session.close()
      }
    },
    PostsEmotionsByCurrentUser: async (object, params, context, resolveInfo) => {
      const { postId } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (transaction) => {
        const emotionsTransactionResponse = await transaction.run(
          `
            MATCH (user:User {id: $userId})-[emoted:EMOTED]->(post:Post {id: $postId})
            RETURN collect(emoted.emotion) as emotion
          `,
          { userId: context.user.id, postId },
        )
        return emotionsTransactionResponse.records.map((record) => record.get('emotion'))
      })
      try {
        const [emotions] = await readTxResultPromise
        return emotions
      } finally {
        session.close()
      }
    },
  },
  Mutation: {
    CreatePost: async (_parent, params, context, _resolveInfo) => {
      const {
        categoryIds,
        groupId,
        image: imageInput,
        files: filesInput,
        drawing: drawingInput,
        audio: audioInput
      } = params

      const locationName = validateEventParams(params)

      delete params.categoryIds
      delete params.image
      delete params.groupId
      delete params.files
      delete params.drawing
      delete params.audio

      params.id = params.id || uuid()

      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        let groupCypher = ''
        if (groupId) {
          groupCypher = `
            WITH post MATCH (group:Group { id: $groupId })
            MERGE (post)-[:IN]->(group)`
          const groupTypeResponse = await transaction.run(
            `
            MATCH (group:Group { id: $groupId }) RETURN group.groupType AS groupType`,
            { groupId },
          )
          const [groupType] = groupTypeResponse.records.map((record) => record.get('groupType'))
          if (groupType !== 'public')
            groupCypher += `
             WITH post, group
             MATCH (user:User)-[membership:MEMBER_OF]->(group)
               WHERE group.groupType IN ['closed', 'hidden']
                 AND membership.role IN ['usual', 'admin', 'owner']
             WITH post, collect(user.id) AS userIds
             OPTIONAL MATCH path =(restricted:User) WHERE NOT restricted.id IN userIds 
             FOREACH (user IN nodes(path) |
               MERGE (user)-[:CANNOT_SEE]->(post)
             )`
        }
        const categoriesCypher =
          CONFIG.CATEGORIES_ACTIVE && categoryIds
            ? `WITH post
              UNWIND $categoryIds AS categoryId
              MATCH (category:Category {id: categoryId})
              MERGE (post)-[:CATEGORIZED]->(category)`
            : ''
        const createPostTransactionResponse = await transaction.run(
          `
            CREATE (post:Post)
            SET post += $params
            SET post.createdAt = toString(datetime())
            SET post.updatedAt = toString(datetime())
            SET post.clickedCount = 0
            SET post.viewedTeaserCount = 0
            SET post:${params.postType}
            WITH post
            MATCH (author:User {id: $userId})
            MERGE (post)<-[:WROTE]-(author)
            ${categoriesCypher}
            ${groupCypher}
            RETURN post {.*, postType: [l IN labels(post) WHERE NOT l = 'Post'] }
          `,
          { userId: context.user.id, categoryIds, groupId, params },
        )
        const [post] = createPostTransactionResponse.records.map((record) => record.get('post'))
        if (imageInput) {
          await mergeImage(post, 'HERO_IMAGE', imageInput, { transaction })
        }

        if (drawingInput) {
          await mergeDrawing(post, 'DRAWING', drawingInput, { transaction })
        }

        if (audioInput) {
          await mergeDrawing(post, 'AUDIO', audioInput, { transaction })
        }

        if(filesInput && filesInput.length) {
          const createFilesAndRelationPromises = filesInput.map(async fileInput => {
            const { name, type, alt, upload } = fileInput
            const url = await uploadFile(upload);

            const file = await transaction.run(
              `
                MATCH (post:Post {id: $postId})
                WITH post
                CREATE (file:File {
                  id: $id,
                  url: $url,
                  name: $name,
                  type: $type,
                  alt: $alt
                })
                SET file.createdAt = toString(datetime())
                MERGE (post)<-[:FILES]-(file)
              `,
              {
                postId: post.id,
                id: uuid(),
                url,
                name,
                type,
                alt
              }
            );

            const [createdFile] = file.records.map(record => record.get('file'))

            return createdFile;
          });

          await Promise.all(createFilesAndRelationPromises);
        }

        return post
      })
      try {
        const post = await writeTxResultPromise
        if (locationName) {
          await createOrUpdateLocations('Post', post.id, locationName, session)
        }
        return post
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Post with this slug already exists!')
        throw new Error(e)
      } finally {
        session.close()
      }
    },
    UpdatePost: async (_parent, params, context, _resolveInfo) => {
      const {
        categoryIds,
        image: imageInput,
        files: filesInput,
        drawing: drawingInput,
        audio: audioInput
      } = params

      const locationName = validateEventParams(params)

      delete params.drawing
      delete params.categoryIds
      delete params.image
      delete params.files
      delete params.audio

      const session = context.driver.session()
      let updatePostCypher = `
        MATCH (post:Post {id: $params.id})
        SET post += $params
        SET post.updatedAt = toString(datetime())
        WITH post
      `

      if (CONFIG.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
        const cypherDeletePreviousRelations = `
          MATCH (post:Post { id: $params.id })-[previousRelations:CATEGORIZED]->(category:Category)
          DELETE previousRelations
          RETURN post, category
          `

        await session.writeTransaction((transaction) => {
          return transaction.run(cypherDeletePreviousRelations, { params })
        })

        updatePostCypher += `
          UNWIND $categoryIds AS categoryId
          MATCH (category:Category {id: categoryId})
          MERGE (post)-[:CATEGORIZED]->(category)
          WITH post
        `
      }

      if (params.postType) {
        updatePostCypher += `
          REMOVE post:Article
          REMOVE post:Event
          SET post:${params.postType}
          WITH post
        `
      }

      updatePostCypher += `RETURN post {.*, postType: [l IN labels(post) WHERE NOT l = 'Post']}`
      const updatePostVariables = { categoryIds, params }
      try {
        const writeTxResultPromise = session.writeTransaction(async (transaction) => {
          const updatePostTransactionResponse = await transaction.run(
            updatePostCypher,
            updatePostVariables,
          )
          const [post] = updatePostTransactionResponse.records.map((record) => record.get('post'))
          await mergeImage(post, 'HERO_IMAGE', imageInput, { transaction })
          await mergeDrawing(post, 'DRAWING', drawingInput, { transaction })
          await mergeDrawing(post, 'AUDIO', audioInput, { transaction })

          if(filesInput && filesInput.length) {
            const createFilesAndRelationPromises = filesInput.map(async fileInput => {
              const { name, type, alt, upload } = fileInput
              const url = await uploadFile(upload);

              const file = await transaction.run(
                `
                  MATCH (post:Post {id: $postId})
                  WITH post
                  CREATE (file:File {
                    id: $id,
                    url: $url,
                    name: $name,
                    type: $type,
                    alt: $alt
                  })
                  SET file.createdAt = toString(datetime())
                  MERGE (post)<-[:FILES]-(file)
                `,
                {
                  postId: post.id,
                  id: uuid(),
                  url,
                  name,
                  type,
                  alt
                }
              );

              const [createdFile] = file.records.map(record => record.get('file'))

              return createdFile;
            });

            await Promise.all(createFilesAndRelationPromises);
          }

          return post
        })
        const post = await writeTxResultPromise
        if (locationName) {
          await createOrUpdateLocations('Post', post.id, locationName, session)
        }
        return post
      } finally {
        session.close()
      }
    },

    DeletePost: async (object, args, context, resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const deletePostTransactionResponse = await transaction.run(
          `
            MATCH (post:Post {id: $postId})
            OPTIONAL MATCH (post)<-[:COMMENTS]-(comment:Comment)
            OPTIONAL MATCH (post)<-[:FILES]-(file:File)
            SET post.deleted        = TRUE
            SET post.content        = 'UNAVAILABLE'
            SET post.contentExcerpt = 'UNAVAILABLE'
            SET post.title          = 'UNAVAILABLE'
            SET comment.deleted     = TRUE
            WITH post, COLLECT(file) as files
            RETURN post {.*}, files
          `,
          { postId: args.id },
        )
        const records = deletePostTransactionResponse.records;
        const [post] = records.map(record => record.get('post'));
        const [files] = records.map(record => record.get('files'));
        await deleteImage(post, 'HERO_IMAGE', { transaction })
        await deleteDrawing(post, 'DRAWING', { transaction })
        await deleteDrawing(post, 'AUDIO', { transaction })

        const deleteFilePromises = files.map(async (file) => {
          await deleteFile(file);
        });
        await Promise.all(deleteFilePromises);
        return post
      })
      try {
        const post = await writeTxResultPromise
        return post
      } finally {
        session.close()
      }
    },
    AddPostEmotions: async (object, params, context, resolveInfo) => {
      const { to, data } = params
      const { user } = context
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const addPostEmotionsTransactionResponse = await transaction.run(
          `
          MATCH (userFrom:User {id: $user.id}), (postTo:Post {id: $to.id})
          MERGE (userFrom)-[emotedRelation:EMOTED {emotion: $data.emotion}]->(postTo)
          RETURN userFrom, postTo, emotedRelation`,
          { user, to, data },
        )
        return addPostEmotionsTransactionResponse.records.map((record) => {
          return {
            from: { ...record.get('userFrom').properties },
            to: { ...record.get('postTo').properties },
            ...record.get('emotedRelation').properties,
          }
        })
      })
      try {
        const [emoted] = await writeTxResultPromise
        return emoted
      } finally {
        session.close()
      }
    },
    RemovePostEmotions: async (object, params, context, resolveInfo) => {
      const { to, data } = params
      const { id: from } = context.user
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const removePostEmotionsTransactionResponse = await transaction.run(
          `
            MATCH (userFrom:User {id: $from})-[emotedRelation:EMOTED {emotion: $data.emotion}]->(postTo:Post {id: $to.id})
            DELETE emotedRelation
            RETURN userFrom, postTo
          `,
          { from, to, data },
        )
        return removePostEmotionsTransactionResponse.records.map((record) => {
          return {
            from: { ...record.get('userFrom').properties },
            to: { ...record.get('postTo').properties },
            emotion: data.emotion,
          }
        })
      })
      try {
        const [emoted] = await writeTxResultPromise
        return emoted
      } finally {
        session.close()
      }
    },
    pinPost: async (_parent, params, context, _resolveInfo) => {
      let pinnedPostWithNestedAttributes
      const { driver, user } = context
      const session = driver.session()
      const { id: userId } = user
      let writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const deletePreviousRelationsResponse = await transaction.run(
          `
          MATCH (:User)-[previousRelations:PINNED]->(post:Post)
          REMOVE post.pinned
          DELETE previousRelations
          RETURN post
        `,
        )
        return deletePreviousRelationsResponse.records.map(
          (record) => record.get('post').properties,
        )
      })
      try {
        await writeTxResultPromise

        writeTxResultPromise = session.writeTransaction(async (transaction) => {
          const pinPostTransactionResponse = await transaction.run(
            `
            MATCH (user:User {id: $userId}) WHERE user.role = 'admin'
            MATCH (post:Post {id: $params.id})
            WHERE NOT((post)-[:IN]->(:Group))
            MERGE (user)-[pinned:PINNED {createdAt: toString(datetime())}]->(post)
            SET post.pinned = true
            RETURN post, pinned.createdAt as pinnedAt
         `,
            { userId, params },
          )
          return pinPostTransactionResponse.records.map((record) => ({
            pinnedPost: record.get('post').properties,
            pinnedAt: record.get('pinnedAt'),
          }))
        })
        const [transactionResult] = await writeTxResultPromise
        if (transactionResult) {
          const { pinnedPost, pinnedAt } = transactionResult
          pinnedPostWithNestedAttributes = {
            ...pinnedPost,
            pinnedAt,
          }
        }
      } finally {
        session.close()
      }
      return pinnedPostWithNestedAttributes
    },
    unpinPost: async (_parent, params, context, _resolveInfo) => {
      let unpinnedPost
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const unpinPostTransactionResponse = await transaction.run(
          `
          MATCH (:User)-[previousRelations:PINNED]->(post:Post {id: $params.id})
          REMOVE post.pinned
          DELETE previousRelations
          RETURN post
        `,
          { params },
        )
        return unpinPostTransactionResponse.records.map((record) => record.get('post').properties)
      })
      try {
        ;[unpinnedPost] = await writeTxResultPromise
      } finally {
        session.close()
      }
      return unpinnedPost
    },
    markTeaserAsViewed: async (_parent, params, context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const transactionResponse = await transaction.run(
          `
          MATCH (post:Post { id: $params.id })
          MATCH (user:User { id: $userId })
          MERGE (user)-[relation:VIEWED_TEASER { }]->(post)
          ON CREATE
          SET relation.createdAt = toString(datetime()),
          post.viewedTeaserCount = post.viewedTeaserCount + 1
          RETURN post
        `,
          { userId: context.user.id, params },
        )
        return transactionResponse.records.map((record) => record.get('post').properties)
      })
      try {
        const [post] = await writeTxResultPromise
        post.viewedTeaserCount = post.viewedTeaserCount.low
        return post
      } finally {
        session.close()
      }
    },
  },
  Post: {
    ...Resolver('Post', {
      undefinedToNull: [
        'activityId',
        'objectId',
        'language',
        'pinnedAt',
        'pinned',
        'eventVenue',
        'eventLocation',
        'eventLocationName',
        'eventStart',
        'eventEnd',
        'eventIsOnline',
      ],
      hasMany: {
        tags: '-[:TAGGED]->(related:Tag)',
        categories: '-[:CATEGORIZED]->(related:Category)',
        comments: '<-[:COMMENTS]-(related:Comment)',
        shoutedBy: '<-[:SHOUTED]-(related:User)',
        emotions: '<-[related:EMOTED]',
        files: '<-[:FILES]-(related:File)'
      },
      hasOne: {
        author: '<-[:WROTE]-(related:User)',
        pinnedBy: '<-[:PINNED]-(related:User)',
        image: '-[:HERO_IMAGE]->(related:Image)',
        drawing: '-[:DRAWING]->(related:Drawing)',
        audio: '-[:AUDIO]->(related:Drawing)',
        group: '-[:IN]->(related:Group)',
        eventLocation: '-[:IS_IN]->(related:Location)',
      },
      count: {
        commentsCount:
          '<-[:COMMENTS]-(related:Comment) WHERE NOT related.deleted = true AND NOT related.disabled = true',
        shoutedCount:
          '<-[:SHOUTED]-(related:User) WHERE NOT related.deleted = true AND NOT related.disabled = true',
        emotionsCount: '<-[related:EMOTED]-(:User)',
      },
      boolean: {
        shoutedByCurrentUser:
          'MATCH(this)<-[:SHOUTED]-(related:User {id: $cypherParams.currentUserId}) RETURN COUNT(related) >= 1',
        viewedTeaserByCurrentUser:
          'MATCH (this)<-[:VIEWED_TEASER]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
      },
    }),
    relatedContributions: async (parent, params, context, resolveInfo) => {
      if (typeof parent.relatedContributions !== 'undefined') return parent.relatedContributions
      const { id } = parent
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const relatedContributionsTransactionResponse = await transaction.run(
          `
            MATCH (p:Post {id: $id})-[:TAGGED|CATEGORIZED]->(categoryOrTag)<-[:TAGGED|CATEGORIZED]-(post:Post)
            WHERE NOT post.deleted AND NOT post.disabled
            RETURN DISTINCT post
            LIMIT 10
          `,
          { id },
        )
        return relatedContributionsTransactionResponse.records.map(
          (record) => record.get('post').properties,
        )
      })
      try {
        const relatedContributions = await writeTxResultPromise
        return relatedContributions
      } finally {
        session.close()
      }
    },
  },
}
