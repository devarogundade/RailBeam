<script setup lang="ts">
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue';
import FilterIcon from '@/components/icons/FilterIcon.vue';
import OutIcon from '@/components/icons/OutIcon.vue';
import PendingIcon from '@/components/icons/PendingIcon.vue';
import ReceiveIcon from '@/components/icons/ReceiveIcon.vue';
import SendIcon from '@/components/icons/SendIcon.vue';
import SwapIcon from '@/components/icons/SwapIcon.vue';
import UsersIcon from '@/components/icons/UsersIcon.vue';
import { useWalletStore } from '@/stores/wallet';
import { computed, onMounted, ref } from 'vue';
import type { Token, Transaction } from "@railbeam/beam-ts";
import { getToken, getTokens } from "@railbeam/beam-ts";
import { beamSdk } from "@/scripts/beamSdk";
import CompletedIcon from '@/components/icons/CompletedIcon.vue';
import { formatUnits } from 'viem';
import Converter from '@/scripts/converter';
import PaymentsIcon from '@/components/icons/PaymentsIcon.vue';
import ArrowDownIcon from '@/components/icons/ArrowDownIcon.vue';
import ArrowUpIcon from '@/components/icons/ArrowUpIcon.vue';
import { TokenContract } from '@/scripts/erc20';
import AllAssets from '@/components/AllAssets.vue';
import ProgressBox from '@/components/ProgressBox.vue';
import { TransactionType } from "@railbeam/beam-ts";
import ReceiveToken from '@/components/ReceiveToken.vue';
import UserIcon from '@/components/icons/UserIcon.vue';
import { useBeamOneTimeTransactionsQuery } from '@/query/beam';
import StorageImage from '@/components/StorageImage.vue';
import RequestWithdraw from '@/components/RequestWithdraw.vue';
import WithdrawRequestsPanel from '@/components/WithdrawRequestsPanel.vue';

const VITE_EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL;

const activeIndex = ref<number>(-1);
const walletStore = useWalletStore();
const balances = ref<{ [key: string]: number; }>({
  "0x0000000000000000000000000000000000000000": 0,
});
const tokens = ref<Token[]>([]);
const receiveToken = ref<boolean>(false);
const allAssets = ref<boolean>(false);
const requestWithdraw = ref<boolean>(false);
const withdrawRequestsOpen = ref<boolean>(false);

const address = computed(() => walletStore.address);
const transactionsQuery = useBeamOneTimeTransactionsQuery(address, { page: 1, limit: 50 });
const progress = computed(() => transactionsQuery.isLoading.value);
const transactions = computed<Transaction[]>(() => transactionsQuery.data.value ?? []);
const activeTransaction = computed<Transaction | null>(() => {
  if (activeIndex.value < 0) return null;
  return transactions.value?.[activeIndex.value] ?? null;
});
const withdrawRequests = computed<Transaction[]>(() =>
  (transactions.value ?? []).filter((t) => t.type === TransactionType.Send),
);

const getTokenBalances = async () => {
  if (!walletStore.merchant) return;

  tokens.value = getTokens.filter(t => walletStore.merchant?.tokens.includes(t.address));

  for (let index = 0; index < tokens.value.length; index++) {
    const balance = await TokenContract.getTokenBalance(
      tokens.value[index].address,
      walletStore.merchant.wallet
    );
    balances.value[tokens.value[index].address] = Number(
      formatUnits(balance, tokens.value[index].decimals)
    );
  }
};

onMounted(() => {
  getTokenBalances();
});
</script>

<template>
  <div class="treasury">
    <div class="assets_grid">
      <div class="assets">
        <div class="assets_head">
          <p>Total Value Locked</p>

          <button class="withdraw_requests_btn" @click="withdrawRequestsOpen = true" :disabled="!walletStore.merchant">
            <p>Withdraw Requests</p>
            <ChevronRightIcon />
          </button>
        </div>

        <div class="assets_value">
          <div class="value_amount">
            <p>$
              {{
                Converter.toMoney(
                  tokens.reduce((a: number, b: any) => a + (b.price || 0) * (balances[b.address] || 0), 0) || 0
                )
              }}
              <span>+0.00%</span>
            </p>
          </div>

          <div class="value_tokens">
            <div class="images">
              <StorageImage v-for="token in tokens.slice(0, 3)" :key="token.address" :src="token.image" alt="" />
              <StorageImage src="/images/token.png" alt="" />
            </div>

            <p>{{ tokens.length }} <span>Assets</span></p>
          </div>
        </div>

        <div class="assets_actions">
          <button @click="requestWithdraw = true" :disabled="!walletStore.merchant">
            <SendIcon />
            <p>Withdraw</p>
          </button>

          <button @click="receiveToken = true">
            <ReceiveIcon />
            <p>Receive</p>
          </button>
        </div>
      </div>

      <div class="top_assets">
        <div class="assets_head">
          <p>Top Assets</p>

          <div class="dropdown" @click="allAssets = true">
            <div class="dropdown_item">
              <p>All</p>
              <ChevronRightIcon />
            </div>
          </div>
        </div>

        <div class="top_asset" v-for="token, index in tokens.slice(0, 3)" :key="index">
          <div class="info">
            <StorageImage :src="token.image" alt="" />
            <p>{{ token.name }}</p>
          </div>

          <div class="balance">
            <p>{{ Converter.toMoney(balances[token.address]) }} <span>{{ token.symbol }}</span></p>
          </div>

          <div class="price">
            <p>${{ Converter.toMoney(token.price * balances[token.address]) }}</p>
            <div v-if="index % 2 == 0">
              <ArrowDownIcon />
              <span>-0.0%</span>
            </div>
            <div v-else>
              <ArrowUpIcon />
              <span>+0.0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ProgressBox v-if="progress" />

    <div class="transactions" v-else>
      <div class="title">
        <div class="name">
          <p>Transactions</p>
          <p>{{ transactions.length }} <span>Txns</span></p>
        </div>

        <button class="filter">
          <FilterIcon />
          <p>Filter</p>
        </button>
      </div>

      <div v-if="activeTransaction" class="txn_expanded_overlay" role="dialog" aria-modal="true"
        @click.self="activeIndex = -1">
        <div class="txn_expanded_panel">
          <div class="txn_expanded_header">
            <button class="txn_expanded_close" @click="activeIndex = -1">
              <ChevronRightIcon />
              <p>Back</p>
            </button>

            <div class="txn_expanded_title">
              <p class="txn_expanded_name">
                {{
                  activeTransaction.description?.length > 0
                    ? activeTransaction.description
                    : activeTransaction.type == TransactionType.OneTime
                      ? 'One Time'
                      : activeTransaction.type == TransactionType.Recurrent
                        ? 'Recurrent'
                        : 'Send'
                }}
              </p>
              <p class="txn_expanded_subtitle">
                {{
                  Intl.DateTimeFormat('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(activeTransaction.blockTimestamp * 1000)
                }}
              </p>
            </div>

            <div class="txn_expanded_status">
              <div class="status"
                v-if="activeTransaction.type == TransactionType.OneTime && activeTransaction.payers.length < activeTransaction.fulfilleds.length">
                <PendingIcon />
                <p>Pending</p>
              </div>

              <div class="status"
                v-if="activeTransaction.type == TransactionType.OneTime && activeTransaction.payers.length == activeTransaction.fulfilleds.length">
                <CompletedIcon />
                <p>Completed</p>
              </div>

              <div class="status" v-if="activeTransaction.type == TransactionType.Recurrent">
                <CompletedIcon />
                <p>Completed</p>
              </div>
            </div>
          </div>

          <div class="txn_expanded_body">
            <div class="txn_expanded_summary">
              <div class="txn_expanded_summary_card">
                <p>Amount</p>
                <div class="txn_expanded_amount">
                  <p>
                    {{
                      Converter.toMoney(
                        Number(
                          formatUnits(
                            activeTransaction.adjustedAmount,
                            getToken(activeTransaction.adjustedToken)?.decimals || 18,
                          ),
                        ),
                      )
                    }}
                    <span>{{ getToken(activeTransaction.adjustedToken)?.symbol }}</span>
                  </p>
                  <p class="txn_expanded_amount_usd">
                    ≈ ${{
                      Converter.toMoney(
                        (getToken(activeTransaction.adjustedToken)?.price || 0) *
                        Number(
                          formatUnits(
                            activeTransaction.adjustedAmount,
                            getToken(activeTransaction.adjustedToken)?.decimals || 18,
                          ),
                        ),
                      )
                    }}
                  </p>
                </div>
              </div>

              <div class="txn_expanded_summary_card">
                <p>Signers</p>
                <div class="txn_expanded_signers">
                  <p v-if="activeTransaction.type == TransactionType.OneTime">
                    {{ activeTransaction.fulfilleds.length }} <span>of {{ activeTransaction.payers.length }}</span>
                  </p>
                  <p v-if="activeTransaction.type == TransactionType.Recurrent">1 <span>of 1</span></p>
                  <p v-if="activeTransaction.type == TransactionType.Send">-</p>
                </div>
              </div>
            </div>

            <div class="confirmation txn_expanded_confirmations">
              <div class="confirmation_title">
                <p>Confirmations</p>
              </div>

              <div class="confirmation_signers"
                :style="`grid-template-columns: repeat(${Math.max(activeTransaction.confirmations.length, 1)}, 1fr);`">
                <div class="confirmation_signer" v-for="(conf, cIdx) in activeTransaction.confirmations" :key="cIdx">
                  <div class="signer_wrapper">
                    <div class="signer_info">
                      <UserIcon />
                      <p>Signer {{ cIdx + 1 }}</p>
                    </div>
                    <p>{{ Converter.fineAddress(conf.from, 6) }}</p>
                  </div>
                  <a target="_blank" :href="`${VITE_EXPLORER_URL}/tx/${conf.transactionHash}`">
                    <OutIcon />
                  </a>
                </div>
                <div v-if="activeTransaction.confirmations.length === 0" class="confirmation_empty">
                  <p>No confirmations yet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <td>Type</td>
            <td>Time</td>
            <td>Status</td>
            <td>Signers</td>
            <td>Amount</td>
            <td></td>
          </tr>
        </thead>

        <tbody>
          <template v-for="(transaction, index) in transactions" :key="index">
            <tr @click="index == activeIndex ? activeIndex = - 1 : activeIndex = index"
              :class="index == activeIndex ? 'active_transaction' : ''">
              <td>
                <div class="txn_cell">
                  <PaymentsIcon v-if="transaction.type == TransactionType.OneTime" />
                  <PaymentsIcon v-if="transaction.type == TransactionType.Recurrent" />
                  <SendIcon v-if="transaction.type == TransactionType.Send" />

                  <div class="txn_cell_info">
                    <p v-if="transaction.type == TransactionType.OneTime">{{
                      transaction.description?.length > 0 ? transaction.description : 'One Time'
                      }}</p>
                    <p v-if="transaction.type == TransactionType.Recurrent">{{
                      transaction.description?.length > 0 ?
                        transaction.description : 'Recurrent'
                    }}</p>
                    <p v-if="transaction.type == TransactionType.Send">{{
                      transaction.description?.length > 0 ?
                        transaction.description : 'Send'
                    }}</p>

                    <div v-if="transaction.type == TransactionType.OneTime">
                      <p>{{ transaction.payers.length }} {{ transaction.payers.length < 2 ? 'Signer' : 'Signers' }}</p>
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <div class="time">
                  <p>
                    {{
                      Intl.DateTimeFormat('en-US', {
                        day: '2-digit',
                        month: 'short',
                      }).format(transaction.blockTimestamp * 1000)
                    }}
                  </p>
                  <p>
                    {{
                      Intl.DateTimeFormat('en-US', {
                        second: '2-digit',
                        minute: '2-digit',
                        hour: '2-digit'
                      }).format(transaction.blockTimestamp * 1000)
                    }}
                  </p>
                </div>
              </td>

              <td>
                <div class="status"
                  v-if="transaction.type == TransactionType.OneTime && transaction.payers.length < transaction.fulfilleds.length">
                  <PendingIcon />
                  <p>Pending</p>
                </div>

                <div class="status"
                  v-if="transaction.type == TransactionType.OneTime && transaction.payers.length == transaction.fulfilleds.length">
                  <CompletedIcon />
                  <p>Completed</p>
                </div>

                <div class="status" v-if="transaction.type == TransactionType.Recurrent">
                  <CompletedIcon />
                  <p>Completed</p>
                </div>
              </td>

              <td>
                <div class="signers">
                  <div class="users">
                    <UsersIcon />
                    <p v-if="transaction.type == TransactionType.OneTime">
                      {{ transaction.fulfilleds.length }} <span>of {{ transaction.payers.length }}</span>
                    </p>

                    <p v-if="transaction.type == TransactionType.Recurrent">1 <span>of 1</span> </p>
                  </div>

                  <div class=" progress">
                    <div v-if="transaction.type == TransactionType.OneTime" class="bar"
                      :style="`width: ${(transaction.fulfilleds.length / transaction.payers.length) * 100}%`"></div>

                    <div v-if="transaction.type == TransactionType.Recurrent" class="bar" :style="`width: ${100}%`">
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <div class="amount">
                  <p v-if="transaction.type == TransactionType.OneTime">
                    {{
                      Converter.toMoney(
                        Number(
                          formatUnits(
                            transaction.adjustedAmount,
                            getToken(transaction.adjustedToken)?.decimals || 18,
                          ),
                        )
                      )
                    }}
                    <span>{{ getToken(transaction.adjustedToken)?.symbol }}</span>
                  </p>
                  <p v-if="transaction.type == TransactionType.OneTime">≈ ${{ Converter.toMoney(
                    (getToken(transaction.adjustedToken)?.price || 0) * Number(
                      formatUnits(
                        transaction.adjustedAmount,
                        getToken(transaction.adjustedToken)?.decimals || 18,
                      ),
                    )

                  ) }}
                  </p>

                  <p v-if="transaction.type == TransactionType.Recurrent">
                    {{
                      Converter.toMoney(
                        Number(
                          formatUnits(
                            transaction.adjustedAmount,
                            getToken(transaction.adjustedToken)?.decimals || 18,
                          ),
                        )
                      )
                    }}
                    <span>{{ getToken(transaction.adjustedToken)?.symbol }}</span>
                  </p>
                  <p v-if="transaction.type == TransactionType.Recurrent">≈ ${{ Converter.toMoney(
                    (getToken(transaction.adjustedToken)?.price || 0) * Number(
                      formatUnits(
                        transaction.adjustedAmount,
                        getToken(transaction.adjustedToken)?.decimals || 18,
                      ),
                    ))
                  }}
                  </p>
                </div>
              </td>

              <td>
                <div class="view_dropdown">
                  <div class="view">
                    <ChevronDownIcon />
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="empty" v-if="!progress && transactions.length == 0">
        <StorageImage src="/images/empty.png" alt="" />
        <p>No transactions.</p>
      </div>
    </div>

    <ReceiveToken v-if="walletStore.merchant && receiveToken" :address="walletStore.merchant.wallet"
      @close="receiveToken = false" />
    <RequestWithdraw v-if="walletStore.merchant && requestWithdraw" :wallet="walletStore.merchant.wallet"
      :tokens="tokens" :balances="balances" :defaultRecipient="walletStore.address" @close="requestWithdraw = false" />
    <WithdrawRequestsPanel v-if="walletStore.merchant && withdrawRequestsOpen" :wallet="walletStore.merchant.wallet"
      :tokens="tokens" :requests="withdrawRequests" :minSigners="walletStore.merchant.minSigners"
      @close="withdrawRequestsOpen = false" />
    <AllAssets v-if="allAssets" :balances="balances" :tokens="tokens" @close="allAssets = false" />
  </div>
</template>

<style scoped>
.treasury {
  padding: 30px 50px;
  padding-bottom: 100px;
}

.assets_grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}


.assets {
  padding-right: 20px;
  border-right: 1px solid var(--bg-lightest);
}

.top_assets {
  padding-left: 20px;
}

.top_asset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 65px;
  border-bottom: 1px solid var(--bg-lightest);
}

.top_asset .info {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 150px;
}

.top_asset .info :deep(img) {
  width: 30px;
  height: 30px;
  border-radius: 10px;
}

.top_asset .info p {
  color: var(--tx-normal);
  font-size: 16px;
}

.top_asset .balance {
  width: 150px;
}

.top_asset .balance p {
  color: var(--tx-normal);
  font-size: 14px;
}

.top_asset .balance p span {
  color: var(--tx-semi);
  font-size: 14px;
}

.top_asset .price {
  width: 150px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.top_asset .price p {
  color: var(--tx-normal);
  font-size: 16px;
}

.top_asset .price span {
  color: var(--tx-semi);
  font-size: 16px;
}

.top_asset .price div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.assets_head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--bg-lightest);
  padding-bottom: 20px;
}

.withdraw_requests_btn {
  border-radius: 6px;
  border: 1px solid var(--bg-lightest);
  background: none;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.withdraw_requests_btn p {
  color: var(--tx-semi);
  font-size: 14px;
}

.withdraw_requests_btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.withdraw_requests_btn :deep(svg) {
  width: 14px;
  height: 14px;
}

.assets_head>p {
  color: var(--tx-semi);
  font-size: 16px;
}

.assets_head .dropdown {
  border-radius: 6px;
  border: 1px solid var(--bg-lightest);
}

.dropdown_item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;
}

.assets_head p {
  color: var(--tx-semi);
  font-size: 14px;
}

.assets_value {
  padding: 30px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--bg-lightest);
}

.value_amount>p {
  color: var(--tx-normal);
  font-size: 26px;
}

.value_amount>p span {
  color: var(--accent-green);
  font-size: 14px;
}

.stats {
  gap: 12px;
  margin-top: 10px;
  display: flex;
  align-items: center;
}

.stat {
  display: flex;
  gap: 4px;
}

.stat p {
  color: var(--tx-semi);
  font-size: 14px;
}

.stat p span {
  color: var(--tx-dimmed);
}

.value_tokens {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.images :deep(img) {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-left: -10px;
}

.value_tokens p {
  margin-top: 10px;
  color: var(--tx-semi);
  font-size: 14px;
}

.value_tokens p span {
  color: var(--tx-dimmed);
}

.assets_actions {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.assets_actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 8px;
  background: none;
  gap: 10px;
  width: 100%;
  border: 1px solid var(--bg-lightest);
  height: 40px;
  cursor: pointer;
}

.assets_actions button p {
  font-size: 14px;
  color: var(--tx-normal);
}

.transactions {
  margin-top: 30px;
  position: relative;
}

.transactions .title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.transactions .title p:first-child {
  color: var(--tx-normal);
  font-size: 16px;
}

.transactions .title p:last-child {
  margin-top: 2px;
  color: var(--tx-semi);
  font-size: 14px;
}

.transactions .title p:last-child span {
  color: var(--tx-dimmed);
}

.filter {
  height: 40px;
  padding: 0 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  background: none;
}

.filter svg {
  width: 20;
  height: 20;
}

.filter p {
  font-size: 16px;
  color: var(--tx-normal);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--bg-light);
  border-radius: 8px;
}

thead tr {
  height: 38px;
}

thead td {
  color: var(--tx-semi);
  font-size: 14px;
}

td:first-child {
  padding-left: 20px;
}

td:last-child {
  padding-right: 20px;
}

thead td:nth-child(5) {
  text-align: right;
}

tbody tr {
  height: 94px;
  padding: 0 20px;
  border-bottom: 1px solid var(--bg-lighter);
}

tbody td {
  cursor: pointer;
}

tbody tr:last-child {
  border: none;
}

tbody td:last-child {
  display: flex;
  height: 94px;
  align-items: center;
  justify-content: center;
}


.txn_cell {
  display: flex;
  align-items: center;
  gap: 16px;
}

.txn_cell>svg {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--bg-lightest);
  object-fit: contain;
}

.txn_cell_info>p {
  color: var(--tx-normal);
  font-size: 16px;
}

.txn_cell_info div {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.txn_cell_info div p {
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_cell_info div svg {
  width: 12px;
  height: 12px;
}

.time p:first-child {
  color: var(--tx-normal);
  font-size: 16px;
}

.time p:last-child {
  color: var(--tx-semi);
  font-size: 14px;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--bg-lighter);
  padding: 0 12px;
  height: 30px;
  width: fit-content;
  border-radius: 8px;
}

.status p {
  color: var(--tx-normal);
  font-size: 14px;
}


.signers .users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signers .users p {
  font-size: 16px;
  color: var(--tx-normal);
}

.signers .users p span {
  color: var(--tx-semi);
}

.signers .progress {
  margin-top: 10px;
  width: 70px;
  height: 5px;
  border-radius: 10px;
  background: var(--bg-lighter);
}

.signers .bar {
  height: 100%;
  background: var(--primary-light);
  border-radius: 10px;
}

.amount {
  text-align: right;
}

.amount p:first-child {
  color: var(--tx-normal);
  font-size: 16px;
}

.amount p:first-child span {
  color: var(--tx-semi);
}

.amount p:last-child {
  color: var(--tx-semi);
  font-size: 14px;
}

.view_dropdown {
  padding: 0 10px;
  display: flex;
  justify-content: flex-end;
}

.view {
  width: 32px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--bg-lighter);
}

tr {
  position: relative;
}

.active_transaction {
  background: var(--bg-lighter);
}

.confirmation {
  width: 100%;
  min-height: 132px;
  padding: 20px;
  background: var(--bg-light);
  border: 1px solid var(--bg-lightest);
  border-radius: 12px;
}

.confirmation_title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
}

.confirmation_title p {
  color: var(--tx-semi);
  font-size: 14px;
}

.confirmation_signers {
  margin-top: 20px;
  width: 100%;
  display: grid;
  gap: 12px;
}

.confirmation_signer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid var(--bg-lightest);
  border-radius: 12px;
}

.confirmation_signer:last-child {
  border-right: none;
}

.confirmation_empty {
  padding: 14px;
  border: 1px dashed var(--bg-lightest);
  border-radius: 12px;
}

.confirmation_empty p {
  color: var(--tx-semi);
  font-size: 14px;
}

.signer_wrapper p {
  margin-top: 6px;
  color: var(--tx-normal);
  font-size: 14px;
}

.signer_info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.signer_info p {
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_expanded_overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--bg) 60%, transparent);
  z-index: 10;
  border-radius: 12px;
  padding: 12px;
}

.txn_expanded_panel {
  width: 100%;
  height: 100%;
  background: var(--bg);
  border: 1px solid var(--bg-lightest);
  border-radius: 14px;
  overflow: auto;
}

.txn_expanded_header {
  position: sticky;
  top: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--bg-lightest);
  padding: 16px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
}

.txn_expanded_close {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--bg-lightest);
  background: none;
}

.txn_expanded_close p {
  color: var(--tx-normal);
  font-size: 14px;
}

.txn_expanded_close :deep(svg) {
  width: 14px;
  height: 14px;
  transform: rotate(180deg);
}

.txn_expanded_title {
  min-width: 0;
}

.txn_expanded_name {
  color: var(--tx-normal);
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.txn_expanded_subtitle {
  margin-top: 4px;
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_expanded_status {
  display: flex;
  justify-content: flex-end;
}

.txn_expanded_body {
  padding: 16px;
}

.txn_expanded_summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.txn_expanded_summary_card {
  border: 1px solid var(--bg-lightest);
  border-radius: 12px;
  padding: 14px;
  background: var(--bg-light);
}

.txn_expanded_summary_card>p {
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_expanded_amount {
  margin-top: 8px;
}

.txn_expanded_amount p:first-child {
  color: var(--tx-normal);
  font-size: 18px;
}

.txn_expanded_amount p:first-child span {
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_expanded_amount_usd {
  margin-top: 6px;
  color: var(--tx-semi);
  font-size: 14px;
}

.txn_expanded_signers {
  margin-top: 10px;
}

.txn_expanded_signers p {
  color: var(--tx-normal);
  font-size: 16px;
}

.txn_expanded_signers p span {
  color: var(--tx-semi);
}

.txn_expanded_confirmations {
  margin-top: 12px;
  background: var(--bg);
}
</style>
