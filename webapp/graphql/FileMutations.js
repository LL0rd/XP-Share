import gql from 'graphql-tag'

export default (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return {
    DeleteFile: gql`
      mutation($id: ID!) {
        DeleteFile(id: $id) {
          id
          createdAt
          url
          name
          alt
          type
        }
      }
    `,
  }
}
