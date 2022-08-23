import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import {
  createGroupMutation,
  joinGroupMutation,
  changeGroupMemberRoleMutation,
  groupMembersQuery,
  groupQuery,
} from '../../db/graphql/groups'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import CONFIG from '../../config'

const driver = getDriver()
const neode = getNeode()

let authenticatedUser
let user

const categoryIds = ['cat9', 'cat4', 'cat15']
const descriptionAdditional100 =
  ' 123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789'
let variables = {}

const { server } = createServer({
  context: () => {
    return {
      driver,
      neode,
      user: authenticatedUser,
    }
  },
})
const { mutate, query } = createTestClient(server)

const seedBasicsAndClearAuthentication = async () => {
  variables = {}
  user = await Factory.build(
    'user',
    {
      id: 'current-user',
      name: 'TestUser',
    },
    {
      email: 'test@example.org',
      password: '1234',
    },
  )
  await Promise.all([
    neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      slug: 'democracy-politics',
      icon: 'university',
    }),
    neode.create('Category', {
      id: 'cat4',
      name: 'Environment & Nature',
      slug: 'environment-nature',
      icon: 'tree',
    }),
    neode.create('Category', {
      id: 'cat15',
      name: 'Consumption & Sustainability',
      slug: 'consumption-sustainability',
      icon: 'shopping-cart',
    }),
    neode.create('Category', {
      id: 'cat27',
      name: 'Animal Protection',
      slug: 'animal-protection',
      icon: 'paw',
    }),
  ])
  authenticatedUser = null
}

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
})

describe('in mode', () => {
  describe('clean db after each single test', () => {
    beforeEach(async () => {
      await seedBasicsAndClearAuthentication()
    })

    // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
    afterEach(async () => {
      await cleanDatabase()
    })

    describe('CreateGroup', () => {
      beforeEach(() => {
        variables = {
          ...variables,
          id: 'g589',
          name: 'The Best Group',
          slug: 'the-group',
          about: 'We will change the world!',
          description: 'Some description' + descriptionAdditional100,
          groupType: 'public',
          actionRadius: 'regional',
          categoryIds,
        }
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({ mutation: createGroupMutation, variables })
          expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
        })
      })

      describe('authenticated', () => {
        beforeEach(async () => {
          authenticatedUser = await user.toJson()
        })

        it('creates a group', async () => {
          await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject({
            data: {
              CreateGroup: {
                name: 'The Best Group',
                slug: 'the-group',
                about: 'We will change the world!',
              },
            },
            errors: undefined,
          })
        })

        it('assigns the authenticated user as owner', async () => {
          await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject({
            data: {
              CreateGroup: {
                name: 'The Best Group',
                myRole: 'owner',
              },
            },
            errors: undefined,
          })
        })

        it('has "disabled" and "deleted" default to "false"', async () => {
          await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject({
            data: { CreateGroup: { disabled: false, deleted: false } },
          })
        })

        describe('description', () => {
          describe('length without HTML', () => {
            describe('less then 100 chars', () => {
              it('throws error: "Too view categories!"', async () => {
                const { errors } = await mutate({
                  mutation: createGroupMutation,
                  variables: {
                    ...variables,
                    description:
                      '0123456789' +
                      '<a href="https://domain.org/0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789">0123456789</a>',
                  },
                })
                expect(errors[0]).toHaveProperty('message', 'Description too short!')
              })
            })
          })
        })

        describe('categories', () => {
          beforeEach(() => {
            CONFIG.CATEGORIES_ACTIVE = true
          })

          describe('not even one', () => {
            it('throws error: "Too view categories!"', async () => {
              const { errors } = await mutate({
                mutation: createGroupMutation,
                variables: { ...variables, categoryIds: null },
              })
              expect(errors[0]).toHaveProperty('message', 'Too view categories!')
            })
          })

          describe('four', () => {
            it('throws error: "Too many categories!"', async () => {
              const { errors } = await mutate({
                mutation: createGroupMutation,
                variables: { ...variables, categoryIds: ['cat9', 'cat4', 'cat15', 'cat27'] },
              })
              expect(errors[0]).toHaveProperty('message', 'Too many categories!')
            })
          })
        })
      })
    })

    describe('Group', () => {
      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await query({ query: groupQuery, variables: {} })
          expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
        })
      })

      describe('authenticated', () => {
        let otherUser

        beforeEach(async () => {
          otherUser = await Factory.build(
            'user',
            {
              id: 'other-user',
              name: 'Other TestUser',
            },
            {
              email: 'test2@example.org',
              password: '1234',
            },
          )
          authenticatedUser = await otherUser.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'others-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'global',
              categoryIds,
            },
          })
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'my-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
            },
          })
        })

        describe('query groups', () => {
          describe('without any filters', () => {
            it('finds all groups', async () => {
              await expect(query({ query: groupQuery, variables: {} })).resolves.toMatchObject({
                data: {
                  Group: expect.arrayContaining([
                    expect.objectContaining({
                      id: 'my-group',
                      slug: 'the-best-group',
                      myRole: 'owner',
                    }),
                    expect.objectContaining({
                      id: 'others-group',
                      slug: 'uninteresting-group',
                      myRole: null,
                    }),
                  ]),
                },
                errors: undefined,
              })
            })
          })

          describe('isMember = true', () => {
            it('finds only groups where user is member', async () => {
              await expect(
                query({ query: groupQuery, variables: { isMember: true } }),
              ).resolves.toMatchObject({
                data: {
                  Group: [
                    {
                      id: 'my-group',
                      slug: 'the-best-group',
                      myRole: 'owner',
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })

          describe('isMember = false', () => {
            it('finds only groups where user is not(!) member', async () => {
              await expect(
                query({ query: groupQuery, variables: { isMember: false } }),
              ).resolves.toMatchObject({
                data: {
                  Group: expect.arrayContaining([
                    expect.objectContaining({
                      id: 'others-group',
                      slug: 'uninteresting-group',
                      myRole: null,
                    }),
                  ]),
                },
                errors: undefined,
              })
            })
          })
        })
      })
    })

    describe('JoinGroup', () => {
      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: joinGroupMutation,
            variables: {
              groupId: 'not-existing-group',
              userId: 'current-user',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
        })
      })

      describe('authenticated', () => {
        let ownerOfClosedGroupUser
        let ownerOfHiddenGroupUser

        beforeEach(async () => {
          // create users
          ownerOfClosedGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-closed-group',
              name: 'Owner Of Closed Group',
            },
            {
              email: 'owner-of-closed-group@example.org',
              password: '1234',
            },
          )
          ownerOfHiddenGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-hidden-group',
              name: 'Owner Of Hidden Group',
            },
            {
              email: 'owner-of-hidden-group@example.org',
              password: '1234',
            },
          )
          // create groups
          // public-group
          authenticatedUser = await ownerOfClosedGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'closed-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'national',
              categoryIds,
            },
          })
          authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'hidden-group',
              name: 'Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'public-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
            },
          })
        })

        describe('public group', () => {
          describe('joined by "owner-of-closed-group"', () => {
            it('has "usual" as membership role', async () => {
              await expect(
                mutate({
                  mutation: joinGroupMutation,
                  variables: {
                    groupId: 'public-group',
                    userId: 'owner-of-closed-group',
                  },
                }),
              ).resolves.toMatchObject({
                data: {
                  JoinGroup: {
                    id: 'owner-of-closed-group',
                    myRoleInGroup: 'usual',
                  },
                },
                errors: undefined,
              })
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation,
                    variables: {
                      groupId: 'public-group',
                      userId: 'current-user',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'current-user',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })

        describe('closed group', () => {
          describe('joined by "current-user"', () => {
            it('has "pending" as membership role', async () => {
              await expect(
                mutate({
                  mutation: joinGroupMutation,
                  variables: {
                    groupId: 'closed-group',
                    userId: 'current-user',
                  },
                }),
              ).resolves.toMatchObject({
                data: {
                  JoinGroup: {
                    id: 'current-user',
                    myRoleInGroup: 'pending',
                  },
                },
                errors: undefined,
              })
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation,
                    variables: {
                      groupId: 'closed-group',
                      userId: 'owner-of-closed-group',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'owner-of-closed-group',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })

        describe('hidden group', () => {
          describe('joined by "owner-of-closed-group"', () => {
            it('throws authorization error', async () => {
              const { errors } = await query({
                query: joinGroupMutation,
                variables: {
                  groupId: 'hidden-group',
                  userId: 'owner-of-closed-group',
                },
              })
              expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
            })
          })

          describe('joined by its owner', () => {
            describe('does not create additional "MEMBER_OF" relation and therefore', () => {
              it('has still "owner" as membership role', async () => {
                await expect(
                  mutate({
                    mutation: joinGroupMutation,
                    variables: {
                      groupId: 'hidden-group',
                      userId: 'owner-of-hidden-group',
                    },
                  }),
                ).resolves.toMatchObject({
                  data: {
                    JoinGroup: {
                      id: 'owner-of-hidden-group',
                      myRoleInGroup: 'owner',
                    },
                  },
                  errors: undefined,
                })
              })
            })
          })
        })
      })
    })
  })

  describe('building up – clean db after each resolver', () => {
    describe('GroupMembers', () => {
      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          variables = {
            id: 'not-existing-group',
          }
          const { errors } = await query({ query: groupMembersQuery, variables })
          expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
        })
      })

      describe('authenticated', () => {
        let otherUser
        let pendingUser
        let ownerOfClosedGroupUser
        let ownerOfHiddenGroupUser

        beforeAll(async () => {
          // create users
          otherUser = await Factory.build(
            'user',
            {
              id: 'other-user',
              name: 'Other TestUser',
            },
            {
              email: 'other-user@example.org',
              password: '1234',
            },
          )
          pendingUser = await Factory.build(
            'user',
            {
              id: 'pending-user',
              name: 'Pending TestUser',
            },
            {
              email: 'pending@example.org',
              password: '1234',
            },
          )
          ownerOfClosedGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-closed-group',
              name: 'Owner Of Closed Group',
            },
            {
              email: 'owner-of-closed-group@example.org',
              password: '1234',
            },
          )
          ownerOfHiddenGroupUser = await Factory.build(
            'user',
            {
              id: 'owner-of-hidden-group',
              name: 'Owner Of Hidden Group',
            },
            {
              email: 'owner-of-hidden-group@example.org',
              password: '1234',
            },
          )
          // create groups
          // public-group
          authenticatedUser = await user.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'public-group',
              name: 'The Best Group',
              about: 'We will change the world!',
              description: 'Some description' + descriptionAdditional100,
              groupType: 'public',
              actionRadius: 'regional',
              categoryIds,
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              groupId: 'public-group',
              userId: 'owner-of-closed-group',
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              groupId: 'public-group',
              userId: 'owner-of-hidden-group',
            },
          })
          // closed-group
          authenticatedUser = await ownerOfClosedGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'closed-group',
              name: 'Uninteresting Group',
              about: 'We will change nothing!',
              description: 'We love it like it is!?' + descriptionAdditional100,
              groupType: 'closed',
              actionRadius: 'national',
              categoryIds,
            },
          })
          await mutate({
            mutation: joinGroupMutation,
            variables: {
              groupId: 'closed-group',
              userId: 'current-user',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation,
            variables: {
              groupId: 'closed-group',
              userId: 'owner-of-hidden-group',
              roleInGroup: 'usual',
            },
          })
          // hidden-group
          authenticatedUser = await ownerOfHiddenGroupUser.toJson()
          await mutate({
            mutation: createGroupMutation,
            variables: {
              id: 'hidden-group',
              name: 'Investigative Journalism Group',
              about: 'We will change all.',
              description: 'We research …' + descriptionAdditional100,
              groupType: 'hidden',
              actionRadius: 'global',
              categoryIds,
            },
          })
          // 'JoinGroup' mutation does not work in hidden groups so we join them by 'ChangeGroupMemberRole' through the owner
          await mutate({
            mutation: changeGroupMemberRoleMutation,
            variables: {
              groupId: 'hidden-group',
              userId: 'pending-user',
              roleInGroup: 'pending',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation,
            variables: {
              groupId: 'hidden-group',
              userId: 'current-user',
              roleInGroup: 'usual',
            },
          })
          await mutate({
            mutation: changeGroupMemberRoleMutation,
            variables: {
              groupId: 'hidden-group',
              userId: 'owner-of-closed-group',
              roleInGroup: 'admin',
            },
          })
          // Wolle:
          // const groups = await query({ query: groupQuery, variables: {} })
          // console.log('groups.data.Group: ', groups.data.Group)
          // const groupMemberOfClosedGroup = await mutate({
          //   mutation: groupMembersQuery,
          //   variables: {
          //     id: 'hidden-group',
          //   },
          // })
          // console.log('groupMemberOfClosedGroup.data.GroupMembers: ', groupMemberOfClosedGroup.data.GroupMembers)

          authenticatedUser = null
        })

        describe('public group', () => {
          beforeEach(async () => {
            variables = {
              id: 'public-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by usual member "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })
          })
        })

        describe('closed group', () => {
          beforeEach(async () => {
            variables = {
              id: 'closed-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by usual member "owner-of-hidden-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfHiddenGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'owner',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'usual',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(3)
              })
            })

            describe('by pending member "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery, variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery, variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
              })
            })
          })
        })

        describe('hidden group', () => {
          beforeEach(async () => {
            variables = {
              id: 'hidden-group',
            }
          })

          describe('query group members', () => {
            describe('by owner "owner-of-hidden-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfHiddenGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by usual member "current-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await user.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by admin member "owner-of-closed-group"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerOfClosedGroupUser.toJson()
              })

              it('finds all members', async () => {
                const result = await mutate({
                  mutation: groupMembersQuery,
                  variables,
                })
                expect(result).toMatchObject({
                  data: {
                    GroupMembers: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'pending-user',
                        myRoleInGroup: 'pending',
                      }),
                      expect.objectContaining({
                        id: 'current-user',
                        myRoleInGroup: 'usual',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-closed-group',
                        myRoleInGroup: 'admin',
                      }),
                      expect.objectContaining({
                        id: 'owner-of-hidden-group',
                        myRoleInGroup: 'owner',
                      }),
                    ]),
                  },
                  errors: undefined,
                })
                expect(result.data.GroupMembers.length).toBe(4)
              })
            })

            describe('by pending member "pending-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await pendingUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery, variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
              })
            })

            describe('by none member "other-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await otherUser.toJson()
              })

              it('throws authorization error', async () => {
                const { errors } = await query({ query: groupMembersQuery, variables })
                expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
              })
            })
          })
        })
      })
    })

    describe('ChangeGroupMemberRole', () => {
      let pendingMemberUser
      let usualMemberUser
      let adminMemberUser
      let ownerMemberUser
      let secondOwnerMemberUser

      beforeAll(async () => {
        await seedBasicsAndClearAuthentication()
        // create users
        pendingMemberUser = await Factory.build(
          'user',
          {
            id: 'pending-member-user',
            name: 'Pending Member TestUser',
          },
          {
            email: 'pending-member-user@example.org',
            password: '1234',
          },
        )
        usualMemberUser = await Factory.build(
          'user',
          {
            id: 'usual-member-user',
            name: 'Usual Member TestUser',
          },
          {
            email: 'usual-member-user@example.org',
            password: '1234',
          },
        )
        adminMemberUser = await Factory.build(
          'user',
          {
            id: 'admin-member-user',
            name: 'Admin Member TestUser',
          },
          {
            email: 'admin-member-user@example.org',
            password: '1234',
          },
        )
        ownerMemberUser = await Factory.build(
          'user',
          {
            id: 'owner-member-user',
            name: 'Owner Member TestUser',
          },
          {
            email: 'owner-member-user@example.org',
            password: '1234',
          },
        )
        secondOwnerMemberUser = await Factory.build(
          'user',
          {
            id: 'second-owner-member-user',
            name: 'Second Owner Member TestUser',
          },
          {
            email: 'second-owner-member-user@example.org',
            password: '1234',
          },
        )
        // create groups
        // public-group
        authenticatedUser = await usualMemberUser.toJson()
        await mutate({
          mutation: createGroupMutation,
          variables: {
            id: 'public-group',
            name: 'The Best Group',
            about: 'We will change the world!',
            description: 'Some description' + descriptionAdditional100,
            groupType: 'public',
            actionRadius: 'regional',
            categoryIds,
          },
        })
        await mutate({
          mutation: joinGroupMutation,
          variables: {
            groupId: 'public-group',
            userId: 'owner-of-closed-group',
          },
        })
        await mutate({
          mutation: joinGroupMutation,
          variables: {
            groupId: 'public-group',
            userId: 'owner-of-hidden-group',
          },
        })
        // closed-group
        authenticatedUser = await ownerMemberUser.toJson()
        await mutate({
          mutation: createGroupMutation,
          variables: {
            id: 'closed-group',
            name: 'Uninteresting Group',
            about: 'We will change nothing!',
            description: 'We love it like it is!?' + descriptionAdditional100,
            groupType: 'closed',
            actionRadius: 'national',
            categoryIds,
          },
        })
        // hidden-group
        authenticatedUser = await adminMemberUser.toJson()
        await mutate({
          mutation: createGroupMutation,
          variables: {
            id: 'hidden-group',
            name: 'Investigative Journalism Group',
            about: 'We will change all.',
            description: 'We research …' + descriptionAdditional100,
            groupType: 'hidden',
            actionRadius: 'global',
            categoryIds,
          },
        })
        // 'JoinGroup' mutation does not work in hidden groups so we join them by 'ChangeGroupMemberRole' through the owner
        await mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: {
            groupId: 'hidden-group',
            userId: 'admin-member-user',
            roleInGroup: 'usual',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: {
            groupId: 'hidden-group',
            userId: 'second-owner-member-user',
            roleInGroup: 'usual',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: {
            groupId: 'hidden-group',
            userId: 'admin-member-user',
            roleInGroup: 'usual',
          },
        })
        await mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: {
            groupId: 'hidden-group',
            userId: 'second-owner-member-user',
            roleInGroup: 'usual',
          },
        })

        authenticatedUser = null
      })

      afterAll(async () => {
        await cleanDatabase()
      })

      describe('unauthenticated', () => {
        it('throws authorization error', async () => {
          const { errors } = await mutate({
            mutation: changeGroupMemberRoleMutation,
            variables: {
              groupId: 'not-existing-group',
              userId: 'current-user',
              roleInGroup: 'pending',
            },
          })
          expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
        })
      })

      describe('authenticated', () => {
        describe('in all group types – here "closed-group" for example', () => {
          beforeEach(async () => {
            variables = {
              groupId: 'closed-group',
            }
          })

          describe('join the members and give them their prospective roles', () => {
            describe('by owner "owner-member-user"', () => {
              beforeEach(async () => {
                authenticatedUser = await ownerMemberUser.toJson()
              })

              describe('for "usual-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'usual-member-user',
                  }
                })

                describe('as usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })

                  // the GQL mutation needs this fields in the result for testing
                  it.todo('has "updatedAt" newer as "createdAt"')
                })
              })

              describe('for "admin-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'admin-member-user',
                  }
                })

                describe('as admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('has role admin', async () => {
                    // Wolle:
                    // const groups = await query({ query: groupQuery, variables: {} })
                    // console.log('groups.data.Group: ', groups.data.Group)
                    // const groupMemberOfClosedGroup = await mutate({
                    //   mutation: groupMembersQuery,
                    //   variables: {
                    //     id: 'closed-group',
                    //   },
                    // })
                    // console.log('groupMemberOfClosedGroup.data.GroupMembers: ', groupMemberOfClosedGroup.data.GroupMembers)
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'admin-member-user',
                          myRoleInGroup: 'admin',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('for "second-owner-member-user"', () => {
                beforeEach(async () => {
                  variables = {
                    ...variables,
                    userId: 'second-owner-member-user',
                  }
                })

                describe('as owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'second-owner-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })
            })
          })

          describe('switch role', () => {
            describe('of owner "owner-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'owner-member-user',
                }
              })

              describe('by owner themself "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              // shall this be possible in the future?
              // or shall only an owner who gave the second owner the owner role downgrade themself for savety?
              // otherwise the first owner who downgrades the other one has the victory over the group!
              describe('by second owner "second-owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await secondOwnerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('to same role owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner still', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'owner-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by admin "admin-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await adminMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })
            })

            describe('of admin "admin-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'admin-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('has role owner', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'admin-member-user',
                          myRoleInGroup: 'owner',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to owner', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'owner',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to pending again', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })
            })

            describe('of usual member "usual-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'usual-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('has role admin', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'admin',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual again', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'usual-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to admin', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'admin',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })

                describe('degrade to pending again', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })
            })

            describe('of still pending member "pending-member-user"', () => {
              beforeEach(async () => {
                variables = {
                  ...variables,
                  userId: 'pending-member-user',
                }
              })

              describe('by owner "owner-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await ownerMemberUser.toJson()
                })

                describe('to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('has role usual', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'pending-member-user',
                          myRoleInGroup: 'usual',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })

                describe('back to pending', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'pending',
                    }
                  })

                  it('has role usual again', async () => {
                    await expect(
                      mutate({
                        mutation: changeGroupMemberRoleMutation,
                        variables,
                      }),
                    ).resolves.toMatchObject({
                      data: {
                        ChangeGroupMemberRole: {
                          id: 'pending-member-user',
                          myRoleInGroup: 'pending',
                        },
                      },
                      errors: undefined,
                    })
                  })
                })
              })

              describe('by usual member "usual-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await usualMemberUser.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by still pending member "pending-member-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await pendingMemberUser.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })

              describe('by none member "current-user"', () => {
                beforeEach(async () => {
                  authenticatedUser = await user.toJson()
                })

                describe('upgrade to usual', () => {
                  beforeEach(async () => {
                    variables = {
                      ...variables,
                      roleInGroup: 'usual',
                    }
                  })

                  it('throws authorization error', async () => {
                    const { errors } = await mutate({
                      mutation: changeGroupMemberRoleMutation,
                      variables,
                    })
                    expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
