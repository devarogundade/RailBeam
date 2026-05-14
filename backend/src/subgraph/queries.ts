export const AGENT_DETAIL_FIELDS = `
  id
  agentId
  owner
  uri
  agentWallet
  feePerDay
  isCloned
  blockNumber
  blockTimestamp
  transactionHash
  metadata {
    id
    agentId
    key
    value
    updatedBy
    blockNumber
    blockTimestamp
    transactionHash
  }
`;

export const GET_AGENT = /* GraphQL */ `
  query GetAgent($id: ID!) {
    agent(id: $id) {
      ${AGENT_DETAIL_FIELDS}
    }
  }
`;

export const GET_FEEDBACKS_BY_AGENT = /* GraphQL */ `
  query FeedbacksByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    feedbacks(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      agentId
      clientAddress
      feedbackIndex
      value
      valueDecimals
      tag1
      tag2
      endpoint
      feedbackURI
      feedbackHash
      revoked
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_VALIDATIONS_BY_AGENT = /* GraphQL */ `
  query ValidationsByAgent($agentId: BigInt!, $first: Int!, $skip: Int!) {
    validations(
      where: { agentId: $agentId }
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_VALIDATION_BY_REQUEST_HASH = /* GraphQL */ `
  query ValidationByRequestHash($requestHash: Bytes!) {
    validations(where: { requestHash: $requestHash }, first: 1) {
      id
      requestHash
      validatorAddress
      agentId
      requestURI
      response
      responseURI
      responseHash
      tag
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

/** Paginated `userSubscriptions` for one subscriber (wallet as `Bytes`). */
export const GET_USER_SUBSCRIPTIONS_PAGE_FILTERED = /* GraphQL */ `
  query UserSubscriptionsPageFiltered($first: Int!, $skip: Int!, $user: Bytes!) {
    userSubscriptions(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
      where: { user: $user }
    ) {
      agentId
      endDate
    }
  }
`;
