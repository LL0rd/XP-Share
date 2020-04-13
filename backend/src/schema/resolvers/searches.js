import log from './helpers/databaseLogger'
import { queryString } from './searches/queryString'

// see http://lucene.apache.org/core/8_3_1/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package.description

const createCypher = (setup) => `
  CALL db.index.fulltext.queryNodes('${setup.fulltextIndex}', $query)
  YIELD node as resource, score
  ${setup.match}
  WHERE score >= 0.0
  ${setup.notClause}
  ${setup.withClause}
  RETURN 
  {
    ${setup.countKeyName}: toString(size(collect(resource))),
    ${setup.resultKeyName}: collect(resource { .*, __typename: labels(resource)[0]${setup.additionalMapping} })
  }
  AS result
`

const simpleNotClause = 'AND NOT (resource.deleted = true OR resource.disabled = true)'

const postNotClause = `AND NOT (
    author.deleted = true OR author.disabled = true
    OR resource.deleted = true OR resource.disabled = true
    OR (:User {id: $userId})-[:MUTED]->(author)
  )`

const searchPostsSetup = {
  fulltextIndex: 'post_fulltext_search',
  match: 'MATCH (resource)<-[:WROTE]-(author:User)',
  notClause: postNotClause,
  withClause: `WITH resource, author,
  [(resource)<-[:COMMENTS]-(comment:Comment) | comment] AS comments,
  [(resource)<-[:SHOUTED]-(user:User) | user] AS shouter`,
  additionalMapping: `, author: properties(author), commentsCount: toString(size(comments)), shoutedCount: toString(size(shouter))`,
  countKeyName: 'postCount',
  resultKeyName: 'posts',
}

const searchUsersSetup = {
  fulltextIndex: 'user_fulltext_search',
  match: 'MATCH (resource)',
  notClause: simpleNotClause,
  withClause: '',
  additionalMapping: '',
  countKeyName: 'userCount',
  resultKeyName: 'users',
}

const searchHashtagsSetup = {
  fulltextIndex: 'tag_fulltext_search',
  match: 'MATCH (resource)',
  notClause: simpleNotClause,
  withClause: '',
  additionalMapping: '',
  countKeyName: 'hashtagCount',
  resultKeyName: 'hashtags',
}

const runSearchTransaction = async (transaction, setup, params) => {
  return transaction.run(createCypher(setup), params)
}

const searchResultPromise = async (session, setup, params) => {
  return session.readTransaction(async (transaction) => {
    return runSearchTransaction(transaction, setup, params)
  })
}

const getSearchResults = async (context, setup, params) => {
  const session = context.driver.session()
  try {
    const results = await searchResultPromise(session, setup, params)
    log(results)
    return results.records[0].get('result')
  } finally {
    session.close()
  }
}

/*
const multiSearchMap = [
  { symbol: '!', setup: searchPostsSetup, resultName: 'posts' },
  { symbol: '@', setup: searchUsersSetup, resultName: 'users' },
  { symbol: '#', setup: searchHashtagsSetup, resultName: 'hashtags' },
] */

const applyLimits = async (result, skip, limit) => {
  Object.keys(result).forEach((key) => {
    if (typeof result[key] === 'object') {
      result[key] = result[key].slice(skip, skip + limit)
    }
  })
  return result
}

export default {
  Query: {
    searchPosts: async (_parent, args, context, _resolveInfo) => {
      const { query, postsOffset, firstPosts } = args
      const { id: userId } = context.user

      return applyLimits(
        await getSearchResults(context, searchPostsSetup, {
          query: queryString(query),
          userId,
        }),
        postsOffset,
        firstPosts,
      )
    },
    searchUsers: async (_parent, args, context, _resolveInfo) => {
      const { query, usersOffset, firstUsers } = args
      return applyLimits(
        await getSearchResults(context, searchUsersSetup, {
          query: queryString(query),
        }),
        usersOffset,
        firstUsers,
      )
    },
    searchHashtags: async (_parent, args, context, _resolveInfo) => {
      const { query, hashtagsOffset, firstHashtags } = args
      return applyLimits(
        await getSearchResults(context, searchHashtagsSetup, {
          query: queryString(query),
        }),
        hashtagsOffset,
        firstHashtags,
      )
    },
    searchResults: async (_parent, args, context, _resolveInfo) => {
      const { query, limit } = args
      const { id: userId } = context.user

      // const searchType = query.replace(/^([!@#]?).*$/, '$1')
      // const searchString = query.replace(/^([!@#])/, '')

      /*
      const params = {
        query: queryString(searchString),
        skip: 0,
        limit,
        userId,
      } */

      const postCypher = `
      CALL db.index.fulltext.queryNodes('post_fulltext_search', $query)
      YIELD node as resource, score
      MATCH (resource)<-[:WROTE]-(author:User)
      WHERE score >= 0.0
      AND NOT (
        author.deleted = true OR author.disabled = true
        OR resource.deleted = true OR resource.disabled = true
        OR (:User {id: $userId})-[:MUTED]->(author)
      )
      WITH resource, author,
      [(resource)<-[:COMMENTS]-(comment:Comment) | comment] as comments,
      [(resource)<-[:SHOUTED]-(user:User) | user] as shouter
      RETURN resource {
        .*,
        __typename: labels(resource)[0],
        author: properties(author),
        commentsCount: toString(size(comments)),
        shoutedCount: toString(size(shouter))
      }
      LIMIT $limit
      `

      const userCypher = `
      CALL db.index.fulltext.queryNodes('user_fulltext_search', $query)
      YIELD node as resource, score
      MATCH (resource)
      WHERE score >= 0.0
      AND NOT (resource.deleted = true OR resource.disabled = true)
      RETURN resource {.*, __typename: labels(resource)[0]}
      LIMIT $limit
      `
      const tagCypher = `
      CALL db.index.fulltext.queryNodes('tag_fulltext_search', $query)
      YIELD node as resource, score
      MATCH (resource)
      WHERE score >= 0.0
      AND NOT (resource.deleted = true OR resource.disabled = true)
      RETURN resource {.*, __typename: labels(resource)[0]}
      LIMIT $limit
      `

      const myQuery = queryString(query)

      const session = context.driver.session()
      const searchResultPromise = session.readTransaction(async (transaction) => {
        const postTransactionResponse = transaction.run(postCypher, {
          query: myQuery,
          limit,
          userId,
        })
        const userTransactionResponse = transaction.run(userCypher, {
          query: myQuery,
          limit,
        })
        const tagTransactionResponse = transaction.run(tagCypher, {
          query: myQuery,
          limit,
        })
        return Promise.all([
          postTransactionResponse,
          userTransactionResponse,
          tagTransactionResponse,
        ])
      })

      try {
        const [postResults, userResults, tagResults] = await searchResultPromise
        log(postResults)
        log(userResults)
        log(tagResults)
        return [...postResults.records, ...userResults.records, ...tagResults.records].map((r) =>
          r.get('resource'),
        )
      } finally {
        session.close()
      }
    },
  },
}
