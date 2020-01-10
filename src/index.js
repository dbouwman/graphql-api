require("cross-fetch/polyfill");
require("isomorphic-form-data");

const { GraphQLServer } = require('graphql-yoga')
// const resolvers = require('./resolvers/item-resolver');
const defaultPlaygroundQuery = require('./graphql/defaultPlaygroundQuery');
// const fs = require('fs');
const { 
  getItem, 
  getItemGroups,
  searchItems,
  getUser,
  searchUsers,
  getGroup, 
  searchGroups
} = require("@esri/arcgis-rest-portal");

const typeDefs = `
scalar JSON

type Query {
  info: String!
  item(id: ID!): Item
  searchItems(query: String!):[Item!]!
  user(username: String): User
  searchUsers(query: String!):[User!]
  group(id: ID!): Group
  searchGroups(query: String!):[Group!]
}

type Item {
  id: String
  owner: String!
  title: String!
  type: String!
  description: String
  snippet: String
  tags: [String]
  typeKeywords: [String]
  properties: JSON, 
  groups: [Group!],
  teams: [Group!]
}

type User {
  id: ID!
  username: String!
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
  modified: Int
  userMembership: GroupMembership
}

type GroupMembership {
  username: String!,
  memberType: String!
}

`;

getSession = function(ctx) {
  let ro = null;
  if (ctx.request.headers.authorization) {
    ro = {};
    console.info(`Auth Header: ${ctx.request.headers.authorization}`);
    // we need to cook up a fake IAuthManager object that we can huck thru 
    // rest js, but does not require actual creds.
    ro.authentication = {
      portal: 'https://www.arcgis.com/sharing/rest',
      getToken: () => {
        console.info(`getToken called. Returning ${ctx.request.headers.authorization}`);
        return Promise.resolve(ctx.request.headers.authorization);
      }
    }
  }
  return ro;
}

const resolvers = {
  Query: {
    info: () => `Start of the start of a GraphQL wrapper for Portal API`,
    item: (parent, args = {}, ctx) => {
      let ro = getSession(ctx);
      return getItem(args.id, ro);
    },
    searchItems: (parent, args = {}, ctx) => {
      return searchItems(args.query).then(r => r.results);
    },
    user: (parent, args = {}, ctx) => {
      console.info(`User Query`);
      let ro = getSession(ctx);
      ro.username = args.username;
      
      return getUser(ro)
      .then(r => {
        console.info(`Response: ${JSON.stringify(r)}`);
        return r;
      })
      .catch(err => {
        console.info(`Error: ${err}`);
        return err
      })
    },
    searchUsers: (parent, args = {}, ctx) => {
      return searchUsers(args.query).then(r => r.results);
    },
    group: (parent, args = {}, ctx) => {
      return getGroup(args.id);
    },
    searchGroups: (parent, args = {}, ctx) => {
      return searchGroups(args.query).then(r => r.results);
    }
  },
  Item: {
    id: (parent) => parent.id,
    owner: (parent) => parent.owner,
    title: (parent) => parent.title,
    type: (parent) => parent.type,
    description: (parent) => parent.description,
    snippet: (parent) => parent.snippet,
    tags: (parent) => parent.tags,
    typeKeywords: (parent) => parent.typeKeywords,
    properties: (parent) => parent.properties || {},
    groups: (parent, args, ctx) => {
      let ro = getSession(ctx);
      return getItemGroups(parent.id, ro)
        .then((response) => {
          return [...response.admin, ...response.member, ...response.other];
        });
    },
    teams: (parent, args, ctx) => {
      let teamProps = ['collaborationGroupId', 'followersGroupId', 'contentGroupId'];
      let ids = teamProps.reduce((acc, prop) => {
        if (parent.properties && parent.properties[prop]) {
          acc.push(parent.properties[prop]);
        }
        return acc;
      }, [])
      // if we have ids, let's get those group ids
      if (ids.length) {
        let ro = getSession(ctx);
        ro.q = ids.map(id =>{
          return `id: ${id}`
        }).join(' OR ');
        return searchGroups(ro)
          .then((r) => r.results)
      } else {
        return Promise.resolve([]);
      }
    }
  },
  User: {
    id: (parent) => parent.id,
    username: (parent) => parent.username,
    firstName: (parent) => parent.firstName,
    lastName: (parent) => parent.lastName,
    description: (parent) => parent.description,
    email: (parent) => parent.email,
    orgId: (parent) => parent.orgId,
    role: (parent) => parent.role,
    privileges: (parent) => parent.privileges,
    access: (parent) => parent.access,
    thumbnail: (parent) => parent.thumbnail,
    tags: (parent) => parent.tags,
    groups: (parent) => parent.groups
  },
  Group: {
    id: (parent) => parent.id,
    owner: (parent) => parent.owner,
    title: (parent) => parent.title,
    description: (parent) => parent.description,
    snippet: (parent) => parent.snippet,
    tags: (parent) => parent.tags,
  },
  GroupMembership: {
    username: (parent) => parent.username,
    memberType: (parent) => parent.memberType,
  }
};

const server = new GraphQLServer({
  typeDefs:typeDefs,
  resolvers,
  context: args => args
})

const opts = {
  // defaultPlaygroundQuery,
  // https: {
  //   key: fs.readFileSync('ssl/server.key'),
  //   cert: fs.readFileSync('ssl/server.cert')
  // }
};

server.start(opts, _ => console.log(`Server is running on http://localhost:4000`))
