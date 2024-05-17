import gql from 'graphql-tag'

export default () => {
  return {
    CreatePost: gql`
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
        $files: [FileInput]
        $image: ImageInput
        $drawing: Upload
        $audio: Upload
        $groupId: ID
        $postType: PostType
        $eventInput: _EventInput
      ) {
        CreatePost(
          id: $id
          title: $title
          slug: $slug
          subtitle: $subtitle
          xpType: $xpType
          isPrivate: $isPrivate
          isAno: $isAno
          isEncrypted: $isEncrypted
          xpDate: $xpDate
          content: $content
          categoryIds: $categoryIds
          image: $image
          files: $files
          audio: $audio
          drawing: $drawing
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
          contentExcerpt
          language
          image {
            url
            sensitive
          }
          drawing {
            url
          }
          audio {
            url
          }
          disabled
          deleted
          postType
          author {
            id
            name
          }
          categories {
            id
          }
          eventStart
          eventVenue
          eventLocationName
          eventLocation {
            lng
            lat
          }
        }
      }
    `,
    UpdatePost: gql`
      mutation (
        $id: ID!
        $title: String!
        $subtitle: String
        $xpType: String
        $isPrivate: Boolean
        $isAno: Boolean
        $isEncrypted: Boolean
        $xpDate: String
        $content: String!
        $image: ImageInput
        $categoryIds: [ID]
        $postType: PostType
        $eventInput: _EventInput
        $files: [FileInput]
        $drawing: Upload
        $audio: Upload
      ) {
        UpdatePost(
          id: $id
          title: $title
          subtitle: $subtitle
          xpType: $xpType
          isPrivate: $isPrivate
          isAno: $isAno
          isEncrypted: $isEncrypted
          xpDate: $xpDate
          content: $content
          image: $image
          categoryIds: $categoryIds
          postType: $postType
          eventInput: $eventInput
          files: $files
          drawing: $drawing
          audio: $audio
        ) {
          id
          title
          subtitle
          xpType
          isPrivate
          isAno
          isEncrypted
          xpDate
          slug
          content
          contentExcerpt
          language
          image {
            url
            sensitive
            aspectRatio
          }
          drawing {
            url
          }
          audio {
            url
          }
          pinnedBy {
            id
            name
            role
          }
          postType
          eventStart
          eventLocationName
          eventVenue
          eventLocation {
            lng
            lat
          }
        }
      }
    `,
    DeletePost: gql`
      mutation ($id: ID!) {
        DeletePost(id: $id) {
          id
        }
      }
    `,
    SoftDeletePost: gql`
      mutation ($id: ID!) {
        SoftDeletePost(id: $id) {
          id
        }
      }
    `,
    AddPostEmotionsMutation: gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        AddPostEmotions(to: $to, data: $data) {
          emotion
          from {
            id
          }
          to {
            id
          }
        }
      }
    `,
    RemovePostEmotionsMutation: gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        RemovePostEmotions(to: $to, data: $data) {
          emotion
          from {
            id
          }
          to {
            id
          }
        }
      }
    `,
    pinPost: gql`
      mutation ($id: ID!) {
        pinPost(id: $id) {
          id
          title
          slug
          content
          contentExcerpt
          language
          pinnedBy {
            id
            name
            role
          }
        }
      }
    `,
    unpinPost: gql`
      mutation ($id: ID!) {
        unpinPost(id: $id) {
          id
          title
          slug
          content
          contentExcerpt
          language
          pinnedBy {
            id
            name
            role
          }
        }
      }
    `,
    markTeaserAsViewed: gql`
      mutation ($id: ID!) {
        markTeaserAsViewed(id: $id) {
          id
        }
      }
    `,
  }
}
