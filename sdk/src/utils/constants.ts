import { zeroAddress, type Hex } from "viem";
import type { Token } from "../types";

export const SCHEMA_JSON = 1;
export const SCHEMA_URL = 2;

export const EIP712_REVISION = "1";

/** Native 0G on 0G Mainnet. */
export const getTokens: Token[] = [
  {
    name: "0G",
    symbol: "0G",
    address: zeroAddress,
    image: "/images/0g.png",
    decimals: 18,
    price: 0.5904,
  },
  {
    name: "USDC.e",
    symbol: "USDC.e",
    address: "0x1f3aa82227281ca364bfb3d253b0f1af1da6473e" as Hex,
    image: "/images/usdc.png",
    decimals: 6,
    price: 0.9998,
  },
  {
    name: "Wrapped 0G",
    symbol: "w0G",
    address: "0x1cd0690ff9a693f5ef2dd976660a8dafc81a109c" as Hex,
    image: "/images/w0g.png",
    decimals: 18,
    price: 0.5904,
  },
  {
    name: "Panda AI",
    symbol: "PAI",
    address: "0x59ef6f3943bbdfe2fb19565037ac85071223e94c" as Hex,
    image: "/images/pai.png",
    decimals: 9,
    price: 0.00001,
  },
];

export const getToken = (address: Hex | undefined): Token | undefined => {
  return getTokens.find((t) => t.address == address);
};

export const sleep = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(ms);
    }, ms);
  });
};

export const ContractAddresses = {
  Mainnet: {
    Beam: "0x38E6AA7c4FdD1A6bEc0aAAadf3bD1699355E6393" as Hex,
    HookManager: "0x967295713C984f952383590c3C62Ca684823BbbE" as Hex,
    Merchant: "0xD0319a33c23FB64d5EE6233ceb66C2A75ADcF6c4" as Hex,
    OneTimeTransaction: "0xA93b39649Ab83903f4d7E7eE7F0bfA68754be29d" as Hex,
    RecurrentTransaction: "0x3bA171032f4123FD97892f787848EB944dD5BF10" as Hex,
    Receipt: "0x3054D5d7240C4a4Bc03E2D3A037B64a2aB720c2D" as Hex,
    IdentityRegistry: "0x8058413563918F3A819b0e320f2d7620c8B1E8c3" as Hex,
    ReputationRegistry: "0x98012307d15926a0354394dF396d8f37a1F8f0bB" as Hex,
    ValidationRegistry: "0x2124CC74B98b39Ff15b4aCCAbB82F298546398c9" as Hex,
    UserRegistry: "0x66ac3e37221aC1C7609Ff1125c36403a30D37682" as Hex,
    libs: {
      AddressLib: "0x6dceDCA60bf15769742935eDfa1b1B72638c5205" as Hex,
      IntegerLib: "0x88CdEAac1f41b55A9CC0D1a3278795093FC6A35c" as Hex,
      HookManagerAddressLib:
        "0xAaA6ba20aEAF4E87a2cDD4ca83A888c418558D6B" as Hex,
      MerchantHashLib: "0xFcC011AB456c010aD9DD2075d68d14A353923092" as Hex,
      OneTimeTransactionBoolLib:
        "0x18E47b8CE75e8bdBDC925b0cdcE54959d61D469d" as Hex,
      OneTimeTransactionHashLib:
        "0x5E136df2331f978035d817777Bee3Bc39491ae3b" as Hex,
      RecurrentTransactionHashLib:
        "0xD7570bc0e11fe315354AE7932C086532b1e38307" as Hex,
    },
  },
};
