export const beamAbi = [
  {
    inputs: [
      {
        internalType: "contract IMerchant",
        name: "merchant_",
        type: "address",
      },
      {
        internalType: "contract IOneTimeTransaction",
        name: "oneTimeTransaction_",
        type: "address",
      },
      {
        internalType: "contract IRecurrentTransaction",
        name: "recurrentTransaction_",
        type: "address",
      },
      {
        internalType: "contract IHookManager",
        name: "hookManager_",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "transactionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "payer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address[]",
        name: "payers",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "address",
        name: "merchant",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adjustedToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "adjustedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "schemaVersion",
            type: "uint8",
          },
          {
            internalType: "string",
            name: "value",
            type: "string",
          },
        ],
        indexed: false,
        internalType: "struct Types.Metadata",
        name: "metadata",
        type: "tuple",
      },
      {
        indexed: false,
        internalType: "enum Enums.TransactionStatus",
        name: "status",
        type: "uint8",
      },
    ],
    name: "OneTimeTransactionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "transactionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "payer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "merchant",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adjustedToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "adjustedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "enum Enums.TransactionStatus",
        name: "status",
        type: "uint8",
      },
    ],
    name: "OneTimeTransactionFulfilled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "transactionId",
        type: "bytes32",
      },
    ],
    name: "RecurrentTransactionCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "transactionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "payer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "merchant",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "subscriptionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "dueDate",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adjustedToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "adjustedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "schemaVersion",
            type: "uint8",
          },
          {
            internalType: "string",
            name: "value",
            type: "string",
          },
        ],
        indexed: false,
        internalType: "struct Types.Metadata",
        name: "metadata",
        type: "tuple",
      },
      {
        indexed: false,
        internalType: "enum Enums.TransactionStatus",
        name: "status",
        type: "uint8",
      },
    ],
    name: "RecurrentTransactionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "transactionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "payer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "merchant",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "subscriptionId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "dueDate",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adjustedToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "adjustedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "enum Enums.TransactionStatus",
        name: "status",
        type: "uint8",
      },
    ],
    name: "RecurrentTransactionFulfilled",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "transactionId",
            type: "bytes32",
          },
        ],
        internalType: "struct Params.CancelRecurrentTransaction",
        name: "params",
        type: "tuple",
      },
    ],
    name: "cancelRecurrentTransaction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "transactionId",
            type: "bytes32",
          },
        ],
        internalType: "struct Params.FulfillOneTimeTransaction",
        name: "params",
        type: "tuple",
      },
    ],
    name: "fulfillOneTimeTransaction",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "transactionId",
            type: "bytes32",
          },
        ],
        internalType: "struct Params.FulfillRecurrentTransaction",
        name: "params",
        type: "tuple",
      },
    ],
    name: "fulfillRecurrentTransaction",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "payers",
            type: "address[]",
          },
          {
            internalType: "address",
            name: "merchant",
            type: "address",
          },
          {
            internalType: "uint256[]",
            name: "amounts",
            type: "uint256[]",
          },
          {
            internalType: "address",
            name: "token",
            type: "address",
          },
          {
            internalType: "string",
            name: "description",
            type: "string",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "schemaVersion",
                type: "uint8",
              },
              {
                internalType: "string",
                name: "value",
                type: "string",
              },
            ],
            internalType: "struct Types.Metadata",
            name: "metadata",
            type: "tuple",
          },
        ],
        internalType: "struct Params.CreateOneTimeTransaction",
        name: "params",
        type: "tuple",
      },
    ],
    name: "oneTimeTransaction",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "merchant",
            type: "address",
          },
          {
            internalType: "bytes32",
            name: "subscriptionId",
            type: "bytes32",
          },
          {
            internalType: "string",
            name: "description",
            type: "string",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "schemaVersion",
                type: "uint8",
              },
              {
                internalType: "string",
                name: "value",
                type: "string",
              },
            ],
            internalType: "struct Types.Metadata",
            name: "metadata",
            type: "tuple",
          },
        ],
        internalType: "struct Params.CreateRecurrentTransaction",
        name: "params",
        type: "tuple",
      },
    ],
    name: "recurrentTransaction",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
