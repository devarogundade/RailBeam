import type {
  ChatHandlerResult,
  StardormChatRichBlock,
} from '@beam/stardorm-api-contract';
import type {
  DraftErc20TransferInput,
  DraftNativeTransferInput,
  DraftNftTransferInput,
} from '@beam/stardorm-api-contract';
import {
  humanAmountFromBaseUnits,
  humanNativeGasAmount,
} from './rich-amount-format';

function shortenEvm(addr: string): string {
  const t = addr.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(t)) {
    return t.length <= 14 ? t : `${t.slice(0, 6)}…${t.slice(-4)}`;
  }
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function shortenCaip2(s: string, max = 40): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function txRichFromNativeDraft(
  d: DraftNativeTransferInput,
): StardormChatRichBlock {
  return {
    type: 'tx',
    title: 'Native transfer draft',
    rows: [
      { label: 'Network', value: shortenCaip2(d.network) },
      { label: 'To', value: shortenEvm(d.to) },
      { label: 'Amount', value: humanNativeGasAmount(d.valueWei) },
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
}

export function txRichFromErc20Draft(
  d: DraftErc20TransferInput,
): StardormChatRichBlock {
  const sym = d.tokenSymbol?.trim() || 'Token';
  const human = humanAmountFromBaseUnits(d.amountWei, d.tokenDecimals);
  return {
    type: 'tx',
    title: `ERC-20 transfer · ${sym}`,
    rows: [
      { label: 'Network', value: shortenCaip2(d.network) },
      { label: 'Token', value: shortenEvm(d.token) },
      { label: 'To', value: shortenEvm(d.to) },
      { label: `Amount (${sym})`, value: human },
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
}

function shortenTxHash(hash: string): string {
  const t = hash.trim().toLowerCase();
  if (t.length <= 18) return t;
  return `${t.slice(0, 10)}…${t.slice(-8)}`;
}

/** Append or replace transaction outcome rows on a `tx` rich card. */
export function mergeTxRichWithHandlerResult(
  rich: StardormChatRichBlock | undefined,
  result: ChatHandlerResult,
): StardormChatRichBlock | undefined {
  if (!rich || rich.type !== 'tx') return rich;
  const baseRows = [...(rich.rows ?? [])].filter(
    (r) => r.label !== 'Transaction status' && r.label !== 'Tx hash',
  );
  if (result.kind === 'wallet_tx') {
    const statusLabel =
      result.status === 'confirmed'
        ? 'Confirmed'
        : result.status === 'failed'
          ? 'Failed'
          : 'Submitted';
    baseRows.push({ label: 'Transaction status', value: statusLabel });
    if (result.txHash) {
      baseRows.push({ label: 'Tx hash', value: shortenTxHash(result.txHash) });
    } else if (result.error) {
      baseRows.push({ label: 'Error', value: result.error.slice(0, 400) });
    }
  } else if (result.kind === 'server' && result.status === 'failed') {
    baseRows.push({ label: 'Transaction status', value: 'Failed' });
  }
  return { ...rich, rows: baseRows };
}

export function txRichFromNftDraft(d: DraftNftTransferInput): StardormChatRichBlock {
  const std = d.standard === 'erc1155' ? 'ERC-1155' : 'ERC-721';
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Network', value: shortenCaip2(d.network) },
    { label: 'Standard', value: std },
    { label: 'Contract', value: shortenEvm(d.contract) },
    { label: 'Token ID', value: d.tokenId },
    { label: 'To', value: shortenEvm(d.to) },
  ];
  if (d.standard === 'erc1155' && d.amount) {
    rows.push({ label: 'Quantity', value: d.amount });
  }
  if (d.note?.trim()) {
    rows.push({ label: 'Note', value: d.note.trim() });
  }
  return {
    type: 'tx',
    title: `NFT transfer · ${std}`,
    rows,
  };
}
