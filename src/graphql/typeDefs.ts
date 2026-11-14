export const typeDefs = `#graphql
  enum Role {
    ADMIN
    WAREHOUSE_MANAGER
    EMPLOYEE
  }

  enum Status {
    PENDING
    ACTIVE
    REJECTED
    INACTIVE
  }

  type User {
    id: ID!
    fullName: String!
    email: String!
    employeeId: String
    role: Role!
    status: Status!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type MessagePayload {
    message: String!
  }

  input SignupInput {
    fullName: String!
    email: String!
    password: String!
  }

  type Query {
    health: String!
    me: User
    pendingUsers: [User!]!
    users(status: Status): [User!]!
  }

  type Mutation {
    signup(input: SignupInput!): MessagePayload!
    login(email: String!, password: String!): AuthPayload!
    approveUser(id: ID!, role: Role): User!
    rejectUser(id: ID!): User!
    updateUserRole(id: ID!, role: Role!): User!
    setUserActive(id: ID!, active: Boolean!): User!
  }
`