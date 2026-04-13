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
