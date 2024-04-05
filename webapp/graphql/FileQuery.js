import gql from 'graphql-tag'

export default (app) => {
  const lang = app.$i18n.locale().toUpperCase()
  return gql`
    query File($postId: ID) {
      File(postId: $postId) {
        id
        createdAt
        url
        name
        alt
        type
      }
    }
  `
}
