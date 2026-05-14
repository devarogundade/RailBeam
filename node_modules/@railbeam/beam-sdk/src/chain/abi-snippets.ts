import { parseAbi } from "viem";

/** Minimal read surface for ERC-8004 identity registry interactions. */
export const identityRegistryReadAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function getFees(uint256 agentId) view returns (uint256)",
  "function getMetadata(uint256 agentId,string metadataKey) view returns (bytes)",
]);

export const identityRegistryWriteAbi = parseAbi([
  "function register() returns (uint256 agentId)",
  "function register(string agentURI) returns (uint256 agentId)",
  "function registerWithMetadataAndFees(string agentURI,(string metadataKey,bytes metadataValue)[],uint256 feesPerDay) returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId,string newURI)",
  "function setMetadata(uint256 agentId,string metadataKey,bytes metadataValue)",
  "function unsetAgentWallet(uint256 agentId)",
  "function setAgentWallet(uint256 agentId,address newWallet,uint256 deadline,bytes signature)",
  "function transfer(address from,address to,uint256 tokenId,bytes sealedKey,bytes proof)",
  "function clone(address to,uint256 tokenId,bytes sealedKey,bytes proof) returns (uint256 newTokenId)",
  "function subscribe(uint256 agentId,uint256 numDays) payable",
  "function unsubscribe(uint256 agentId) returns (uint256 daysLeft,uint256 refund)",
  "function setFees(uint256 agentId,uint256 feePerDay)",
  "function transferFrom(address from,address to,uint256 tokenId)",
  "function safeTransferFrom(address from,address to,uint256 tokenId)",
  "function approve(address to,uint256 tokenId)",
  "function setApprovalForAll(address operator,bool approved)",
]);

export const reputationRegistryReadAbi = parseAbi([
  "function getSummary(uint256 agentId,address[] clientAddresses,string tag1,string tag2) view returns (uint64 count,int128 summaryValue,uint8 summaryValueDecimals)",
  "function getLastIndex(uint256 agentId,address clientAddress) view returns (uint64)",
]);

export const reputationRegistryWriteAbi = parseAbi([
  "function giveFeedback(uint256 agentId,int128 value,uint8 valueDecimals,string tag1,string tag2,string endpoint,string feedbackURI,bytes32 feedbackHash)",
  "function revokeFeedback(uint256 agentId,uint64 feedbackIndex)",
  "function appendResponse(uint256 agentId,address clientAddress,uint64 feedbackIndex,string responseURI,bytes32 responseHash)",
]);

export const validationRegistryReadAbi = parseAbi([
  "function getValidationStatus(bytes32 requestHash) view returns (address validatorAddress,uint256 agentId,uint8 response,bytes32 responseHash,string tag,uint256 lastUpdate)",
  "function getSummary(uint256 agentId,address[] validatorAddresses,string tag) view returns (uint64 count,uint8 averageResponse)",
]);

export const validationRegistryWriteAbi = parseAbi([
  "function validationRequest(address validatorAddress,uint256 agentId,string requestURI,bytes32 requestHash)",
  "function validationResponse(bytes32 requestHash,uint8 response,string responseURI,bytes32 responseHash,string tag)",
]);
