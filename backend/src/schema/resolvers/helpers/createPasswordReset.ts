import normalizeEmail from './normalizeEmail'

export default async function createPasswordReset(options) {
  const { driver, nonce, email, issuedAt = new Date() } = options
  const normalizedEmail = normalizeEmail(email)
  const session = driver.session()
  try {
    const checkEmailTxPromise = session.readTransaction(async (transaction) => {
      const checkEmailResponse = await transaction.run(
        `
          MATCH (email:EmailAddress {email: $email})
          RETURN email
        `,
        { email },
      )
      return checkEmailResponse.records.length > 0
    })
    const emailExists = await checkEmailTxPromise

    if (emailExists) {
      const createPasswordResetTxPromise = session.writeTransaction(async (transaction) => {
        const createPasswordResetTransactionResponse = await transaction.run(
          `
            MATCH (user:User)-[:PRIMARY_EMAIL]->(email:EmailAddress {email:$email})
            CREATE(passwordReset:PasswordReset {nonce: $nonce, issuedAt: datetime($issuedAt), usedAt: NULL})
            MERGE (user)-[:REQUESTED]->(passwordReset)
            RETURN email, passwordReset, user
          `,
          {
            issuedAt: issuedAt.toISOString(),
            nonce,
            email: normalizedEmail,
          },
        )
        return createPasswordResetTransactionResponse.records.map((record) => {
          const { email } = record.get('email').properties
          const { nonce } = record.get('passwordReset').properties
          const { name } = record.get('user').properties
          return { email, nonce, name }
        })
      })
      const [records] = await createPasswordResetTxPromise
      return records || {}
    } else {
      return { error: 'Email not found' }
    }
  } finally {
    session.close()
  }
}
