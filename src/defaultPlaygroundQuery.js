module.exports = `#
# to make authenticated requests, paste this into the http headers below:
# {"authorization":"your-token"}

# Simple Portal API Search
query searchExample {
  searchItems(query: "Wetlands type: Web Map") {
    title
    id
    ownerUsername
  }
}

# Get an item and the groups it's shared to in one request
query itemAndGroups {
  item(id: "8adef46d09304946a2f112a232de19b1") {
    title
    groups {
      title
      id
    }
  }
}

# Get an item, the owner's user, and the groups
query itemOwnerGroup {
  item(id: "8adef46d09304946a2f112a232de19b1") {
    title
    owner {
      firstName
      lastName
      orgId
    }
    groups {
      title
      id
    }
  }
}

# We can enhance the response 
# in this case returning the full url to the group thumbnail
# and the dates in ISO format
query responseEnhancement {
  group(id: "8257e3d0f4fa47dd8eaae7472fdfdcfa") {
    title
    thumbnail
    createdISO
    modifiedISO
    thumbnailUrl
  }
}

# And this can be done for N+1's
query itemSearchPlusOwners {
  searchItems(query: "type: Web Map") {
    title
    id
    owner {
      firstName
      lastName
    }
    createdISO
    modifiedISO
    groups {
      title
      id
    }
  }
}

# Helper: Get a token formatted to the authorization header
# Uses creds embedded in server - !!! purely to make demos easier !!!
query getAuthHeader {
  quickToken
}

# Get Surveys that are in a group
query surveysInGroup {
  surveys(groups: ["816105f03f814b87af650fae11d7e72e"]) {
    id
    title
    description
  }
}

# Get Surveys in a Group, filtered by Type
query draftSurveys {
  surveys(type: "draft", groups: ["816105f03f814b87af650fae11d7e72e"]) {
    id
    title
    description
  }
}

query publishedSurveys {
  surveys(type: "published", groups: ["816105f03f814b87af650fae11d7e72e"]) {
    id
    title
    description
  }
}

# Go Deep. 
# - Get Surveys in a Group
# For each: 
#     - get the Owner User
#     - get the backing service
#     - get the layers in the service
#     - get the total records in each layer
#     - get the last entry in each layer
query surveysInGroupDeep {
  surveys(groups: ["816105f03f814b87af650fae11d7e72e"]) {
    id
    title
    description
    owner {
      username
      fullName
    }
    modified
    modifiedISO
    access,
    service {
      id
      title
      url
      layers {
        id
        name
        totalRecords
        lastEntry
      }
    }
  }
}


# this will make n + 1 requests to ago (one for the search and then one for the formInfo for each result)
query surveysWithSchedules {
  surveys(
    type: "published"
    groups: [
      "816105f03f814b87af650fae11d7e72e"
      "95c6c8202a0e4f189ca0aad12a10d501"
    ]
  ) {
    id
    title
    formInfo {
      status
      schedule {
        start
        end
      }
    }
  }
}

# this will make 1 request to ago (for the specified survey item)
query survey {
  survey(id: "690953aba03f48d7838f361fec7e95c0") {
    id
    title
    description
  }
}

# this will make 2 requests to ago (one for the specified item and one for its formInfo)
query surveyWithSchedule {
  survey(id: "340e63a0bedb4e458c7db0a422b2aaeb") {
    id
    title
    formInfo {
      status
      schedule {
        start
        end
      }
    }
  }
}

query surveyWithSummaryStats {
  survey(id: "340e63a0bedb4e458c7db0a422b2aaeb") {
    id
    title
    description,
    service {
      id
      title
      url
      layers {
        id
        name
        totalRecords
        lastEntry
      }
    }
  }
}

# Working with Datasets

# When we join, we need to ensure that the query returns ~50 
# records or the join request will bomb out. Fixable by 
# switching to rest-js

# Locate a dataset by slug
query datasetRecords {
  dataset(idOrSlug: "DCGIS::crashes-in-dc") {
    name
    url
    owner {
      fullName
    }
    records (query: "MAJORINJURIES_PEDESTRIAN=1")
  }
}

# Query a dataset, by slug, and join results to another datase
query datasetRecordsWithJoin {
  dataset(idOrSlug: "DCGIS::crash-details-table") {
    name
    url
    owner {
      fullName
    }
    records (query: "IMPAIRED='Y' AND SPEEDING='Y' AND MAJORINJURY='Y'" withJoin: "DCGIS::crashes-in-dc" from: "CRIMEID" to: "CRIMEID")
  }
}


`
