/** Override via BeamSDKOptions.graphURL / transactionURL (e.g. Goldsky subgraph on 0G). */
export const Endpoints = {
  BASE_GRAPH_URL: {
    Testnet:
      "https://api.goldsky.com/api/public/project_cly6563u2bhfy01zw7mah9nhs/subgraphs/railbeam/1.3.0/gn",
    Mainnet: "",
  },
  BASE_TRANSACTION_URL: {
    Testnet: "http://localhost:5174",
    Mainnet: "",
  },
};
