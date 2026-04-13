export const beamPageAbi = [
  {
    type: "function",
    name: "setNote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pageKey", type: "bytes32" },
      { name: "note", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getNote",
    stateMutability: "view",
    inputs: [
      { name: "who", type: "address" },
      { name: "pageKey", type: "bytes32" },
    ],
    outputs: [{ name: "note", type: "string" }],
  },
] as const;

