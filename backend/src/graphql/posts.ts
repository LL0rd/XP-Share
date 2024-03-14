import gql from 'graphql-tag'

// ------ mutations

export const createPostMutation = () => {
  return gql`
    mutation (
      $id: ID
      $title: String!
      $subtitle: String
      $xpType: String
      $isPrivate: Boolean
      $isAno: Boolean
      $isEncrypted: Boolean
      $xpDate: String
      $slug: String
      $content: String!
      $categoryIds: [ID]
      $groupId: ID
      $postType: PostType
      $eventInput: _EventInput
    ) {
      CreatePost(
        id: $id
        title: $title
        subtitle: $subtitle
        xpType: $xpType
        isPrivate: $isPrivate
        isAno: $isAno
        isEncrypted: $isEncrypted
        xpDate: $xpDate
        slug: $slug
        content: $content
        categoryIds: $categoryIds
        groupId: $groupId
        postType: $postType
        eventInput: $eventInput
      ) {
        id
        slug
        title
        subtitle
        xpType
        isPrivate
        isAno
        isEncrypted
        xpDate
        content
        disabled
        deleted
        postType
        author {
          name
        }
        categories {
          id
        }
        eventStart
        eventEnd
        eventLocationName
        eventVenue
        eventIsOnline
        eventLocation {
          lng
          lat
        }
      }
    }
  `
}

// ------ queries

export const postQuery = () => {
  return gql`
    query Post($id: ID!) {
      Post(id: $id) {
        id
        title
        content
        isAno
        isPrivate
      }
    }
  `
}

export const filterPosts = () => {
  return gql`
    query Post($filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
      Post(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        id
        title
        content
        eventStart
        xpType
        isAno
        isPrivate
      }
    }
  `
}

export const profilePagePosts = () => {
  return gql`
    query profilePagePosts(
      $filter: _PostFilter
      $first: Int
      $offset: Int
      $orderBy: [_PostOrdering]
    ) {
      profilePagePosts(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        id
        title
        content
        isAno
        isPrivate
      }
    }
  `
}

export const searchPosts = () => {
  return gql`
    query ($query: String!, $firstPosts: Int, $postsOffset: Int) {
      searchPosts(query: $query, firstPosts: $firstPosts, postsOffset: $postsOffset) {
        postCount
        posts {
          id
          title
          content
          isAno
          isPrivate
        }
      }
    }
  `
}
