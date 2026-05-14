import * as React from "react";

/**
 * Keeps UI busy through an on-chain write and the following receipt wait.
 * Wagmi `isPending` often clears once the wallet submits the transaction, before
 * `waitForTransactionReceipt` / `waitForWriteContractReceipt` finishes.
 */
export function useChainConfirmationLoading(walletActionPending: boolean) {
  const [receiptWaitActive, setReceiptWaitActive] = React.useState(false);
  const busy = walletActionPending || receiptWaitActive;
  const awaitingReceiptOnly = receiptWaitActive && !walletActionPending;

  const withReceiptWait = React.useCallback(async <T,>(run: () => Promise<T>): Promise<T> => {
    setReceiptWaitActive(true);
    try {
      return await run();
    } finally {
      setReceiptWaitActive(false);
    }
  }, []);

  return { busy, awaitingReceiptOnly, withReceiptWait };
}
