import gql from 'graphql-tag'
import {
  userFragment,
  postFragment,
  commentFragment,
  postCountsFragment,
  userCountsFragment,
  locationFragment,
  badgesFragment,
  tagsCategoriesAndPinnedFragment,
  fileFragment
} from './Fragments'

export default (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${userCountsFragment}
    ${locationFragment(lang)}
    ${badgesFragment}
    ${postFragment}
    ${postCountsFragment}
    ${tagsCategoriesAndPinnedFragment}
    ${commentFragment}
    ${fileFragment}

    query Post($id: ID!) {
      Post(id: $id) {
        postType
        xpType
        eventStart
        eventEnd
        eventVenue
        eventLocationName
        eventIsOnline
        isAno
        isPrivate
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
          blocked
        }
        comments(orderBy: createdAt_asc) {
          ...comment
          author {
            ...user
            ...userCounts
            ...location
            ...badges
          }
        }
        files {
          ...file
        }
        group {
          id
          name
          slug
        }
      }
    }
  `
}

export const filterPosts = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${userCountsFragment}
    ${locationFragment(lang)}
    ${badgesFragment}
    ${postFragment}
    ${postCountsFragment}
    ${tagsCategoriesAndPinnedFragment}

    query Post($filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
      Post(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        postType
        xpType
        eventStart
        eventEnd
        eventVenue
        isAno
        isPrivate
        eventLocationName
        eventLocation {
          lng
          lat
        }
        eventIsOnline
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        group {
          id
          name
          slug
        }
      }
    }
  `
}

export const profilePagePosts = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${userCountsFragment}
    ${locationFragment(lang)}
    ${badgesFragment}
    ${postFragment}
    ${postCountsFragment}
    ${tagsCategoriesAndPinnedFragment}

    query profilePagePosts(
      $filter: _PostFilter
      $first: Int
      $offset: Int
      $orderBy: [_PostOrdering]
    ) {
      profilePagePosts(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        postType
        xpType
        eventStart
        eventVenue
        eventLocationName
        isAno
        isPrivate
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        group {
          id
          name
          slug
        }
      }
    }
  `
}

export const PostsEmotionsByCurrentUser = () => {
  return gql`
    query PostsEmotionsByCurrentUser($postId: ID!) {
      PostsEmotionsByCurrentUser(postId: $postId)
    }
  `
}

export const relatedContributions = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${userCountsFragment}
    ${locationFragment(lang)}
    ${badgesFragment}
    ${postFragment}
    ${postCountsFragment}
    ${tagsCategoriesAndPinnedFragment}

    query Post($slug: String!) {
      Post(slug: $slug) {
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        relatedContributions(first: 2) {
          ...post
          ...postCounts
          ...tagsCategoriesAndPinned
          author {
            ...user
            ...userCounts
            ...location
            ...badges
          }
        }
      }
    }
  `
}
