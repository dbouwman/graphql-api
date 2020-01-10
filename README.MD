# GraphQL Experiments
This is a simple experiment in using `graphql-yoga` to build a wrapper over various ArcGIS Portal / Feature Service APIs.

**This is purely experimental!**

https://graphql-api-env.q9u5eqjnx4.us-west-2.elasticbeanstalk.com/

## Ideas

- expose core portal entities via graphql
- convert thumbnail etc into fully-qualified urls


## Questions
- how to genericize parts of the graphs that are not searchable and/or vary greatly
  - is there a value in type-specific validations? webmap vs site etc?