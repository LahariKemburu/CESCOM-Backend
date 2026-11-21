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

  enum Uom {
    EACH
    METER
    KILOGRAM
  }

  enum StockType {
    IN
    OUT
  }

  enum StockFilter {
    IN_STOCK
    OUT_OF_STOCK
  }

  enum ItemAction {
    CREATE
    UPDATE
    DEACTIVATE
    REACTIVATE
    IMPORT
    DELETE
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

  type Item {
    id: ID!
    itemCode: String!
    description: String!
    uom: Uom!
    quantity: Int!
  }

  type ItemPage {
    items: [Item!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type ItemStats {
    total: Int!
    inStock: Int!
    outOfStock: Int!
  }

  type StockMovement {
    id: ID!
    itemId: ID!
    itemCode: String!
    itemDescription: String!
    uom: Uom!
    type: StockType!
    quantity: Int!
    balanceAfter: Int!
    note: String
    changedByName: String!
    createdAt: String!
  }

  type StockSummary {
    days: Int!
    inQuantity: Float!
    outQuantity: Float!
    inCount: Int!
    outCount: Int!
    movements: [StockMovement!]!
  }

  type ItemFieldChange {
    field: String!
    oldValue: String
    newValue: String
  }

  type ItemChange {
    id: ID!
    action: ItemAction!
    changes: [ItemFieldChange!]!
    changedByName: String!
    createdAt: String!
  }

  input SignupInput {
    fullName: String!
    email: String!
    password: String!
  }

  input CreateItemInput {
    itemCode: String!
    description: String!
    uom: Uom!
    quantity: Int
  }

  input UpdateItemInput {
    itemCode: String
    description: String
    uom: Uom
  }

  type Query {
    health: String!
    me: User
    pendingUsers: [User!]!
    users(status: Status): [User!]!
    items(search: String, uom: Uom, stock: StockFilter, page: Int, pageSize: Int): ItemPage!
    item(id: ID!): Item
    itemStats: ItemStats!
    stockSummary(days: Int, itemId: ID, limit: Int): StockSummary!
    itemHistory(id: ID!): [ItemChange!]!
  }

  type Mutation {
    signup(input: SignupInput!): MessagePayload!
    login(email: String!, password: String!): AuthPayload!
    approveUser(id: ID!, role: Role): User!
    rejectUser(id: ID!): User!
    updateUserRole(id: ID!, role: Role!): User!
    setUserActive(id: ID!, active: Boolean!): User!
    createItem(input: CreateItemInput!): Item!
    updateItem(id: ID!, input: UpdateItemInput!): Item!
    adjustStock(id: ID!, type: StockType!, quantity: Int!, note: String): Item!
    deleteItem(id: ID!): MessagePayload!
  }
`