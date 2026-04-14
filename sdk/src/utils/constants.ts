import { zeroAddress, type Hex } from "viem";
import type { Token } from "../types";

export const SCHEMA_JSON = 1;
export const SCHEMA_URL = 2;

export const EIP712_REVISION = "1";

/** Native 0G on Galileo testnet; add ERC-20s after you deploy or bridge tokens on 0G Chain. */
export const getTokens: Token[] = [
  {
    name: "0G",
    symbol: "0G",
    address: zeroAddress,
    image: "/images/eth.png",
    decimals: 18,
    aToken: zeroAddress,
    price: 0,
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
  Testnet: {
    Beam: "0x7c1667fB3836a53163B60351652244C0996C86B8" as Hex,
    HookManager: "0x3054D5d7240C4a4Bc03E2D3A037B64a2aB720c2D" as Hex,
    Merchant: "0xD7570bc0e11fe315354AE7932C086532b1e38307" as Hex,
    OneTimeTransaction: "0x98012307d15926a0354394dF396d8f37a1F8f0bB" as Hex,
    RecurrentTransaction: "0xA93b39649Ab83903f4d7E7eE7F0bfA68754be29d" as Hex,
    Receipt: "0x8058413563918F3A819b0e320f2d7620c8B1E8c3" as Hex,
    IdentityRegistry: "0x66ac3e37221aC1C7609Ff1125c36403a30D37682" as Hex,
    ReputationRegistry: "0x18E47b8CE75e8bdBDC925b0cdcE54959d61D469d" as Hex,
    ValidationRegistry: "0x5E136df2331f978035d817777Bee3Bc39491ae3b" as Hex,
    UserRegistry: "0x514Fe0005e1579F8c1075db93BA3B6c9d8070c7B" as Hex,
    libs: {
      AddressLib: "0x52902DC3288173182578B7c15D449A893f2B5615" as Hex,
      IntegerLib: "0x255D2E278c3E009F2d43DB3dB777c411cC56d54a" as Hex,
      HookManagerAddressLib:
        "0x641696c29134808734Ce080811F9Ce93a43Dba40" as Hex,
      MerchantHashLib: "0x6dceDCA60bf15769742935eDfa1b1B72638c5205" as Hex,
      OneTimeTransactionBoolLib:
        "0x88CdEAac1f41b55A9CC0D1a3278795093FC6A35c" as Hex,
      OneTimeTransactionHashLib:
        "0xAaA6ba20aEAF4E87a2cDD4ca83A888c418558D6B" as Hex,
      RecurrentTransactionHashLib:
        "0xFcC011AB456c010aD9DD2075d68d14A353923092" as Hex,
    },
  },
  Mainnet: {},
};
