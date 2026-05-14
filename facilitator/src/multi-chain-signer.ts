import type { FacilitatorEvmSigner } from '@x402/evm';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Chain } from 'viem';
import { createWalletClient, http, publicActions } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';

/** Set for each verify/settle request so RPC calls use the correct chain. */
export const facilitatorNetworkContext = new AsyncLocalStorage<string>();

export function createBeamMultiChainFacilitatorSigner(params: {
  account: PrivateKeyAccount;
  networks: { caip2: string; chain: Chain; rpcUrl: string }[];
}): FacilitatorEvmSigner {
  const clients = new Map(
    params.networks.map((n) => [
      n.caip2,
      createWalletClient({
        account: params.account,
        chain: n.chain,
        transport: http(n.rpcUrl),
      }).extend(publicActions),
    ]),
  );

  function client() {
    const net = facilitatorNetworkContext.getStore();
    if (!net) {
      throw new Error(
        'Facilitator network context missing (internal). Verify/settle must run with payment requirements.',
      );
    }
    const c = clients.get(net);
    if (!c) {
      throw new Error(
        `No RPC client for network ${net}. Configured: ${[...clients.keys()].join(', ')}`,
      );
    }
    return c;
  }

  return {
    getAddresses: () => [params.account.address],
    readContract: (args) =>
      client().readContract({
        ...args,
        args: args.args ?? [],
      }),
    verifyTypedData: (args) =>
      client().verifyTypedData(args as never),
    writeContract: (args) =>
      client().writeContract({
        ...args,
        args: args.args,
      }),
    sendTransaction: (args) => client().sendTransaction(args),
    waitForTransactionReceipt: (args) =>
      client().waitForTransactionReceipt(args),
    getCode: (args) => client().getCode(args),
  };
}
