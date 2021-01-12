import Factory, { cleanDatabase } from '../../db/factories'
import { getDriver } from '../../db/neo4j'
import { gql } from '../../helpers/jest'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

let user
let query
let mutate

const driver = getDriver()

const generateInviteCodeMutation = gql`
  mutation($expiresAt: String = null) {
    GenerateInviteCode(expiresAt: $expiresAt) {
      code
      createdAt
      expiresAt
    }
  }
`

const myInviteCodesQuery = gql`
  query {
    MyInviteCodes {
      code
      createdAt
      expiresAt
    }
  }
`

const isValidInviteCodeQuery = gql`
  query($code: ID) {
    isValidInviteCode(code: $code)
  }
`

beforeAll(async () => {
  await cleanDatabase()
  const { server } = createServer({
    context: () => {
      return {
        driver,
        user,
      }
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
})

describe('inviteCodes', () => {
  describe('as unauthenticated user', () => {
    it('cannot generate invite codes', async () => {
      await expect(mutate({ mutation: generateInviteCodeMutation })).resolves.toEqual(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            }),
          ]),
          data: {
            GenerateInviteCode: null,
          },
        }),
      )
    })

    it('cannot query invite codes', async () => {
      await expect(query({ query: myInviteCodesQuery })).resolves.toEqual(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            }),
          ]),
          data: {
            MyInviteCodes: null,
          },
        }),
      )
    })
  })

  describe('as authenticated user', () => {
    beforeAll(async () => {
      const authenticatedUser = await Factory.build(
        'user',
        {
          role: 'user',
        },
        {
          email: 'user@example.org',
          password: '1234',
        },
      )
      user = await authenticatedUser.toJson()
    })

    it('generates an invite code without expiresAt', async () => {
      await expect(mutate({ mutation: generateInviteCodeMutation })).resolves.toEqual(
        expect.objectContaining({
          errors: undefined,
          data: {
            GenerateInviteCode: {
              code: expect.stringMatching(/^[0-9A-Z]{6,6}$/),
              expiresAt: null,
              createdAt: expect.any(String),
            },
          },
        }),
      )
    })

    it('generates an invite code with expiresAt', async () => {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      await expect(
        mutate({
          mutation: generateInviteCodeMutation,
          variables: { expiresAt: nextWeek.toISOString() },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          errors: undefined,
          data: {
            GenerateInviteCode: {
              code: expect.stringMatching(/^[0-9A-Z]{6,6}$/),
              expiresAt: nextWeek.toISOString(),
              createdAt: expect.any(String),
            },
          },
        }),
      )
    })

    let inviteCodes

    it('returns the created invite codes when queried', async () => {
      const response = await query({ query: myInviteCodesQuery })
      inviteCodes = response.data.MyInviteCodes
      expect(inviteCodes).toHaveLength(2)
    })

    it('does not returns the created invite codes of other users when queried', async () => {
      await Factory.build('inviteCode')
      const response = await query({ query: myInviteCodesQuery })
      inviteCodes = response.data.MyInviteCodes
      expect(inviteCodes).toHaveLength(2)
    })

    it('validates an invite code without expiresAt', async () => {
      const unExpiringInviteCode = inviteCodes.filter((ic) => ic.expiresAt === null)[0].code
      expect(
        query({ query: isValidInviteCodeQuery, variables: { code: unExpiringInviteCode } }),
      ).resolves.toBeTruthy()
    })

    it('validates an invite code with expiresAt in the future', async () => {
      const expiringInviteCode = inviteCodes.filter((ic) => ic.expiresAt !== null)[0].code
      expect(
        query({ query: isValidInviteCodeQuery, variables: { code: expiringInviteCode } }),
      ).resolves.toBeTruthy()
    })

    it.skip('does not validate an invite code which expired in the past', async () => {
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
      const code = await Factory.build('inviteCode', {
        expiresAt: lastWeek.toISOString(),
      })
      expect(
        query({ query: isValidInviteCodeQuery, variables: { code: code.code } }),
      ).resolves.toBeFalsy()
    })
  })
})
