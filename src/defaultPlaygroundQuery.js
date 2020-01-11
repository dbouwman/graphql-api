module.exports = `#
# to make authenticated requests, paste this into the http headers below:
# {"authorization":"your-token"}

# Portal API Search
query searchExample {
  searchItems(query: "Wetlands type: Web Map") {
    title
    id
    ownerUsername
  }
}

query itemAndGroups {
  item(id: "8adef46d09304946a2f112a232de19b1") {
    title
    groups {
      title
      id
    }
  }
}

query graphTraversal {
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

query responseEnhancement {
  group(id: "8257e3d0f4fa47dd8eaae7472fdfdcfa") {
    title
    thumbnail
    thumbnailUrl
  }
}

query itemSearchPlusOwners {
  searchItems(query: "type: Web Map") {
    title
    id
    owner {
      firstName
      lastName
    }
  }
}

#
# Get a token formatted to the authorization header
#
query getAuthHeader {
  quickToken
}

query surveysInGroup {
  surveys(groups: ["816105f03f814b87af650fae11d7e72e"]) {
    id
    title
    description
  }
}

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

# ##########################################################
# below are sample queries we can make to the graphql-api
# the api will proxy those requests to the ago api making
# only the requests necessary to fullfill the request
# ##########################################################

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

`
