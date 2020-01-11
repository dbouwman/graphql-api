module.exports = `
scalar JSON

type Query {
  quickToken: String!
  item(id: ID!): Item
  searchItems(query: String!):[Item!]!
  user(username: String): User
  searchUsers(query: String!):[User!]
  group(id: ID!): Group
  searchGroups(query: String!):[Group!]
  surveys(type: String, groups: [String], q: String): [Survey!]!
  survey(id: ID!): Survey
  dataset(idOrSlug: String!): Dataset
}

type Dataset {
  id: ID!
  name: String!
  url: String
  owner: User
  records(query: String withJoin: String from: String to: String): [JSON]!
}

type Item {
  id: String
  ownerUsername: String!
  owner: User
  title: String!
  type: String!
  description: String
  snippet: String
  tags: [String]
  typeKeywords: [String]
  properties: JSON 
  groups: [Group!]
  teams: [Group!]
  createdISO: String
  modifiedISO: String
}

type User {
  id: ID!
  username: String!
  fullName: String!
  firstName: String!
  lastName: String!
  description: String
  email: String!
  orgId: String
  role: String
  privileges: [String!]
  access: String!
  lastLogin: Int
  created: Int
  modified: Int
  thumbnail: String
  tags: [String!]!
  groups: [Group!]
}

type Group {
  id: ID!
  title: String!
  owner: String!
  description: String
  snippet: String
  tags: [String!]!
  created: Int
  createdISO: String
  modified: Int
  modifiedISO: String
  thumbnail: String
  thumbnailUrl: String!
  userMembership: GroupMembership
}

type GroupMembership {
  username: String!,
  memberType: String!
}

type Survey {
  id: ID!
  title: String!
  description: String
  type: String
  typeKeywords: [String]
  owner: User
  thumbnail: String
  created: Float
  modified: Float
  modifiedISO: String
  access: String
  formInfo: FormInfo
  service: FeatureService
}

type FormInfo {
  status: String
  schedule: SurveySchedule
}

type SurveySchedule {
  start: String
  end: String
}

type FeatureService {
  id: ID!
  title: String!
  url: String!
  layers: [Layer]!
}

type Layer {
  id: ID!
  name: String!
  totalRecords: Int!
  lastEntry: String
}
`;