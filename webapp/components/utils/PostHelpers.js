import PostMutations from '~/graphql/PostMutations.js'

export function postMenuModalsData(truncatedPostName, confirmCallback, softDeleteCallback, cancelCallback = () => {}) {
  return {
    delete: {
      titleIdent: 'delete.contribution.title',
      messageIdent: 'delete.contribution.message',
      messageParams: {
        name: truncatedPostName,
      },
      buttons: {
        confirm: {
          danger: true,
          icon: 'trash',
          textIdent: 'delete.submit',
          callback: confirmCallback,
        },
        cancel: {
          icon: 'close',
          textIdent: 'delete.cancel',
          callback: cancelCallback,
        },
      },
    },
    adminDelete: {
      titleIdent: 'delete.contribution.admin.title',
      messageIdent: 'delete.contribution.admin.message',
      messageParams: {
        name: truncatedPostName,
      },
      buttons: {
        confirm: {
          danger: true,
          icon: 'trash',
          textIdent: 'delete.adminSubmit',
          callback: softDeleteCallback,
        },
        cancel: {
          icon: 'close',
          textIdent: 'delete.cancel',
          callback: cancelCallback,
        },
      },
    }
  }
}

export function deletePostMutation(postId) {
  return {
    mutation: PostMutations().DeletePost,
    variables: {
      id: postId,
    },
  }
}

export function softDeletePostMutation(postId) {
  return {
    mutation: PostMutations().SoftDeletePost,
    variables: {
      id: postId,
    },
  }
}

export function sortTagsAlphabetically(tags) {
  // Make sure the property is valid.
  if (!tags || !tags.length) return false
  /*  Using .slice(0) to make a shallow copy. Otherwise a vue/no-side-effects-in-computed-properties error
      would be thrown because sort() sorts in place. A shallow copy is fine because only first level objects are
      affected by the sort, the original tags object remains unchanged.
  */
  return tags.slice(0).sort(function (a, b) {
    // Converting to lowercase to make sort case insensitive.
    const tagA = a.id.toLowerCase()
    const tagB = b.id.toLowerCase()
    return tagA < tagB ? -1 : tagA > tagB ? 1 : 0
  })
}
