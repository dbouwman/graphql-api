require("cross-fetch/polyfill");
require("isomorphic-form-data");

const { GraphQLServer } = require('graphql-yoga')

const defaultPlaygroundQuery = require('./defaultPlaygroundQuery');

const { 
  getItem, 
  getItemGroups,
  searchItems,
  getUser,
  searchUsers,
  getGroup, 
  searchGroups
} = require("@esri/arcgis-rest-portal");

const typeDefs = require('./schema.js');

/**
 * Construct a session object that can be passed into
 * the ArcGIS Rest Js functions
 * @param {object} ctx Context
 */
const getSession = (ctx) => {
  // default to unauthenticated
  let ro = undefined;
  if (ctx.request.headers.authorization) {
    ro = {};
    console.info(`Auth Header: ${ctx.request.headers.authorization}`);
    // we need to cook up a fake IAuthManager object that we can huck thru 
    // rest js, but does not require actual creds.)
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

/**
 * Fetch wrapper for api calls not yet built into 
 * ArcGIS Rest Js
 * @param {string} url Url to fetch
 * @param {object} ctx context
 */
const get = (url, ctx) => {
  log(url);
  const token = ctx.request.headers.authorization;
  if (token) {
    url = `${url}&token=${token}`;
  }
  return fetch(url)
  .then(res => res.json());
};

/**
 * Functions that run the queries
 */
const resolvers = {
  Query: {
    info: () => `Start of the start of a GraphQL wrapper for Portal API`,
    item: (parent, args = {}, ctx) => {
      let ro = getSession(ctx);
      return getItem(args.id, ro);
    },
    searchItems: (parent, args = {}, ctx) => {
      let ro = getSession(ctx);
      if (ro) {
        ro.q = args.query;
        return searchItems(ro).then(r => r.results);
      } else {
        return searchItems(args.query).then(r => r.results);
      }
      
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
    },
    surveys: (parent, args = {}, ctx) => {
      const { groups, type, q } = args;

      const qParts = [
        'type:Form',
        '-typekeywords:"Survey123 Connect"'
      ];

      if (type) {
        // we are using type here for draft | published
        const typeQ = (type === 'published') ? '-typekeywords:Draft' : 'typekeywords:Draft';
        qParts.push(typeQ);
      }

      if (q) { qParts.push(q); }
      if (groups) {
        const groupQ = groups.map(g => `group:${g}`).join(' OR ');
        qParts.push(`(${groupQ})`);
      }

      const query = qParts.join(' AND ');
      let ro = getSession(ctx);
      if (ro) {
        ro.q = query;
        return searchItems(ro).then(r => r.results);
      } else {
        return searchItems(query).then(r => r.results);
      }
    },
    survey: (parent, args, ctx) => {
      console.log('\n\rGot request for survey');
      let ro = getSession(ctx);
      return getItem(args.id, ro);
    }
  },
  Item: {
    id: (parent) => parent.id,
    ownerUsername: (parent) => parent.owner,
    owner: (parent, args, ctx) => {
      let ro = getSession(ctx) || {};
      console.info(`Getting user for ${parent.owner}`);
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        console.info(`Response: ${JSON.stringify(r)}`);
        return r;
      })
      .catch((err) => {
        console.info(`Error: ${err}`);
        return err
      })
    },
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
    orgId: (parent) => parent.orgId || 'not available',
    role: (parent) => parent.role,
    privileges: (parent) => parent.privileges,
    access: (parent) => parent.access,
    thumbnail: (parent) => parent.thumbnail,
    tags: (parent) => parent.tags,
    groups: (parent) => parent.groups
  },
  Group: {
    id: (parent) => parent.id,
    owner: (parent, args, ctx) => {
      let ro = getSession(ctx) || {};
      console.info(`Getting user for ${parent.owner}`);
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        console.info(`Response: ${JSON.stringify(r)}`);
        return r;
      })
      .catch((err) => {
        console.info(`Error: ${err}`);
        return err
      })
    },
    title: (parent) => parent.title,
    description: (parent) => parent.description,
    snippet: (parent) => parent.snippet,
    tags: (parent) => parent.tags,
    thumbnail: (parent) => parent.thumbnail,
    // We can extend the response objects
    // i.e. instead of relying on the client to understand how to construct 
    // the url to a thumbnail, we can do that in the resolver
    thumbnailUrl: (parent) => {
      // construct the url to the group thumbnail
      if (parent.thumbnail) {
        return `https://www.arcgis.com/sharing/rest/community/groups/${parent.id}/info/${parent.thumbnail}`;
      } else {
        // some default thumbnail
        return `https://www.arcgis.com/group-thumbnail.png`;
      }
    }
  },
  GroupMembership: {
    username: (parent) => parent.username,
    memberType: (parent) => parent.memberType,
  },
  Survey: {
    owner: (parent, args, ctx) => {
      let ro = getSession(ctx) || {};
      console.info(`Getting user for ${parent.owner}`);
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        console.info(`Response: ${JSON.stringify(r)}`);
        return r;
      })
      .catch((err) => {
        console.info(`Error: ${err}`);
        return err
      })
    },
    formInfo: (parent, args, ctx) => {
      if (parent.typeKeywords.includes('Draft')) {
        return {
          schedule: { }
        };
      }

      const { id } = parent;
      const url = `${agoBaseUrl}/content/items/${id}/info/form.json?f=json`;
      return get(url, ctx)
      .then(resp => {
        return resp.settings.openStatusInfo;
      });
    }
  }
};

/**
 * Create instance of the server...
 */
const server = new GraphQLServer({
  typeDefs:typeDefs,
  resolvers,
  context: args => args
})

/**
 * Options for the server...
 */
const opts = {
  defaultPlaygroundQuery
  // https: {
  //   key: fs.readFileSync('ssl/server.key'),
  //   cert: fs.readFileSync('ssl/server.cert')
  // }
};

// Start it up...
server.start(opts, _ => console.log(`Server is running on http://localhost:4000`))
