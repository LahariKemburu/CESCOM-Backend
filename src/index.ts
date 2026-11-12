import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { connectDB } from './config/db'
import { typeDefs } from './graphql/typeDefs'
import { resolvers } from './graphql/resolvers'
import type { Context } from './graphql/context'
import { verifyToken } from './utils/auth'

async function main() {
  await connectDB()
  const server = new ApolloServer<Context>({ typeDefs, resolvers })
  const port = Number(process.env.PORT) || 4000

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => {
      const header = req.headers.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      const payload = token ? verifyToken(token) : null
      return { userId: payload?.userId ?? null, role: payload?.role ?? null }
    },
  })

  console.log(`Server ready at ${url}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})