import { formatUnits } from 'ethers';
import type { StardormChatRichBlock } from '@beam/stardorm-api-contract';
import type {
  DraftErc20TransferInput,
  DraftNativeTransferInput,
  DraftNftTransferInput,
} from '@beam/stardorm-api-contract';

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

function trimDecimalZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
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
      { label: 'Value (wei)', value: d.valueWei },
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
}

export function txRichFromErc20Draft(
  d: DraftErc20TransferInput,
): StardormChatRichBlock {
  let human = '—';
  try {
    human = trimDecimalZeros(formatUnits(BigInt(d.amountWei), d.tokenDecimals));
  } catch {
    /* keep dash */
  }
  const sym = d.tokenSymbol?.trim() || 'Token';
  return {
    type: 'tx',
    title: `ERC-20 transfer · ${sym}`,
    rows: [
      { label: 'Network', value: shortenCaip2(d.network) },
      { label: 'Token', value: shortenEvm(d.token) },
      { label: 'To', value: shortenEvm(d.to) },
      { label: 'Amount', value: `${human} (${d.amountWei} wei)` },
      ...(d.note?.trim() ? [{ label: 'Note', value: d.note.trim() }] : []),
    ],
  };
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
    rows.push({ label: 'Amount', value: d.amount });
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
