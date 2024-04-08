import Resolver from './helpers/Resolver'
export default {
  Drawing: {
    ...Resolver('Drawing', {
      undefinedToNull: [],
    }),
  },
}
