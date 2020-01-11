require("cross-fetch/polyfill");
require("isomorphic-form-data");
require('dotenv').config()

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

const {
  UserSession
} = require("@esri/arcgis-rest-auth");

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
      portal: process.env.PORTAL,
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
  const token = ctx.request.headers.authorization;
  if (token) {
    url = `${url}&token=${token}`;
  }
  return fetch(url)
    .then(res => res.json());
};

/**
 * Log out the size of a response in bytes
 * @param {object} content 
 * @param {string} name 
 */
const logBytes = (content, name)  => {
  const sizeInBytes = new TextEncoder().encode(JSON.stringify(content)).length;
  console.log(`${name} response: ${sizeInBytes}`);
};

/**
 * Functions that run the queries
 */
const resolvers = {
  Query: {
    // Fetch a fresh token for an embedded user - purely to make demoing simpler
    quickToken: () => {
      let session = new UserSession({
        username: process.env.USER,
        password: process.env.PASS
      });
      console.log(`Getting token for ${process.env.USER} from ${process.env.PORTAL}`);
      return session.getToken(process.env.PORTAL)
      .then((result) => {
        return `{ authorization: ${result} }`;
      });
    },
    item: (parent, args = {}, ctx) => {
      let ro = getSession(ctx);
      return getItem(args.id, ro)
      .then(r => {
        logBytes(r, 'Item');
        return r;
      })
    },
    searchItems: (parent, args = {}, ctx) => {
      let ro = getSession(ctx);
      if (ro) {
        ro.q = args.query;
        return searchItems(ro).then(r => {
          logBytes(r, 'Search')
          return r.results
        });
      } else {
        return searchItems(args.query).then(r => {
          logBytes(r, 'Search')
          return r.results
        });
      }
      
    },
    user: (parent, args = {}, ctx) => {
      console.info(`User Query`);
      let ro = getSession(ctx);
      ro.username = args.username;
      
      return getUser(ro)
      .then(r => {
        logBytes(r, 'User');
        return r;
      })
      .catch(err => {
        console.info(`Error: ${err}`);
        return err
      })
    },
    searchUsers: (parent, args = {}, ctx) => {
      return searchUsers(args.query).then(r => {
        logBytes(r, 'Users Search');
        return r.results
      });
    },
    group: (parent, args = {}, ctx) => {
      return getGroup(args.id)
      .then(r => {
        logBytes(r, 'Group');
        return r
      });
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
      let prms;
      if (ro) {
        ro.q = query;
        prms = searchItems(ro);
      } else {
        prms = searchItems(query);
      }
      return prms.then((r) => {
        logBytes(r, 'Survey Search');
        return r.results;
      });
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
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        logBytes(r, 'Owner');        
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
          logBytes(r, 'Item Groups'); 
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
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        logBytes(r, 'Owner');     
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
      ro.username = parent.owner;
      return getUser(ro)
      .then(r => {
        logBytes(r, 'Survey Owner');     
        return r;
      })
      .catch((err) => {
        console.info(`Error: ${err}`);
        return err
      })
    },
    modifiedISO: (parent) => {
      return new Date(parent.created).toISOString();
    },
    formInfo: (parent, args, ctx) => {
      if (parent.typeKeywords.includes('Draft')) {
        return {
          schedule: { }
        };
      }

      const { id } = parent;
      const url = `${process.env.PORTAL}/content/items/${id}/info/form.json?f=json`;
      return get(url, ctx)
      .then(resp => {
        logBytes(resp, 'Form Info');     
        return resp.settings.openStatusInfo;
      });
    },
    service: (parent, args, ctx) => {
      // use the if of the parent to query for related items using Survey2Service type
      const { id } = parent;
      const url = `${process.env.PORTAL}/content/items/${id}/relatedItems?f=json&relationshipType=Survey2Service`;
      return get(url, ctx)
      .then(resp => {
        logBytes(resp, 'Related Survey2Service');   
        if (resp.relatedItems.length) {
          return resp.relatedItems[0];
        }
      })
      .catch((ex) => {
        console.dir(ex);
      });
    }
  },
  FeatureService: {
    layers: (parent, args, ctx) => {
      if (parent.url) {
        return get(`${parent.url}?f=json`, ctx).then((resp) => {
          // for convenience, add url prop for layer
          return resp.layers.map(l => {
            l.url = `${parent.url}/${l.id}`; 
            return l;
          })
        }) 
      } else {
        console.log(`Parent does not have url`);
        return [];
      }

    },
    
  },

  Layer: {
    totalRecords: (parent, args, ctx) => {
      if (parent.url) {
        return get(`${parent.url}/query?f=json&returnGeometry=false&where=1=1&returnCountOnly=true`, ctx)
        .then((r) => { 
          logBytes(r, 'Record Count');   
          return r.count 
        })
        .catch(_ => 0);
      } else {
        return 0;
      }
    },
    lastEntry: (parent, args, ctx) => {
      if (parent.url) {
        return get(`${parent.url}/query?outStatistics=[{"statisticType": "max","onStatisticField": "CreationDate", "outStatisticFieldName": "LastEdit"}]&where=1=1&f=json`, ctx)
        .then((r) => { 
          logBytes(r, 'Last Entry');   
          let ts = r.features[0].attributes.LastEdit; 
          return new Date(ts).toISOString()
        })
        .catch(_ => 'No Data');
      } else {
        return 'No Data';
      }
    },
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
server.start(opts, _ => {
  console.log(`Starting server pointing at ${process.env.PORTAL}`);
  console.log(`Server is running on http://localhost:4000`);
});
