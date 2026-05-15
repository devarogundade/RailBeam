import type { FacilitatorEvmSigner } from '@x402/evm';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  verifyTypedData as ethersVerifyTypedData,
} from 'ethers';

/** Set for each verify/settle request so RPC calls use the correct chain. */
export const facilitatorNetworkContext = new AsyncLocalStorage<string>();

function stripEip712Domain(types: Record<string, unknown>): Record<string, unknown> {
  const { EIP712Domain: _omit, ...rest } = types;
  return rest;
}

export function createBeamMultiChainFacilitatorSigner(params: {
  privateKey: string;
  networks: { caip2: string; chainId: number; rpcUrl: string }[];
}): FacilitatorEvmSigner {
  const treasuryAddress = new Wallet(params.privateKey).address as `0x${string}`;

  const walletsByCaip = new Map(
    params.networks.map((n) => {
      const provider = new JsonRpcProvider(n.rpcUrl, n.chainId, { staticNetwork: true });
      return [n.caip2, new Wallet(params.privateKey, provider)] as const;
    }),
  );

  function signer(): Wallet {
    const net = facilitatorNetworkContext.getStore();
    if (!net) {
      throw new Error(
        'Facilitator network context missing (internal). Verify/settle must run with payment requirements.',
      );
    }
    const w = walletsByCaip.get(net);
    if (!w) {
      throw new Error(`No RPC client for network ${net}. Configured: ${[...walletsByCaip.keys()].join(', ')}`);
    }
    return w;
  }

  return {
    getAddresses: (): readonly `0x${string}`[] => [treasuryAddress],
    readContract: async (args) => {
      const w = signer();
      const c = new Contract(args.address, args.abi as never, w.provider);
      const fn = c.getFunction(args.functionName);
      return fn.staticCall(...(args.args ?? []));
    },
    verifyTypedData: async (args) => {
      try {
        const types = stripEip712Domain(args.types as Record<string, unknown>);
        const recovered = ethersVerifyTypedData(
          args.domain as Parameters<typeof ethersVerifyTypedData>[0],
          types as Parameters<typeof ethersVerifyTypedData>[1],
          args.message as Record<string, unknown>,
          args.signature,
        );
        return recovered.toLowerCase() === args.address.toLowerCase();
      } catch {
        return false;
      }
    },
    writeContract: async (args) => {
      const w = signer();
      const c = new Contract(args.address, args.abi as never, w);
      const fn = c.getFunction(args.functionName);
      const tx =
        args.gas !== undefined
          ? await fn(...args.args, { gasLimit: args.gas })
          : await fn(...args.args);
      return tx.hash as `0x${string}`;
    },
    sendTransaction: async ({ to, data }) => {
      const tx = await signer().sendTransaction({ to, data });
      return tx.hash as `0x${string}`;
    },
    waitForTransactionReceipt: async ({ hash }) => {
      const receipt = await signer().provider!.waitForTransaction(hash);
      if (!receipt) {
        throw new Error(`Missing receipt for ${hash}`);
      }
      const status =
        receipt.status === 1 ? 'success' : receipt.status === 0 ? 'reverted' : 'unknown';
      return { status };
    },
    getCode: async ({ address }) => {
      const bytecode = await signer().provider!.getCode(address);
      if (!bytecode || bytecode === '0x') return undefined;
      return bytecode as `0x${string}`;
    },
  };
}
