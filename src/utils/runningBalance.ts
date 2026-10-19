import { Account, FinancialTransaction } from '../types';

export interface RunningBalanceInfo {
  balanceBefore: number;
  balanceAfter: number;
  impact: number;
  changeType: 'increase' | 'decrease' | 'neutral';
}

/**
 * Normalizes and extracts the best millisecond timestamp for a transaction.
 * Prioritizes full ISO timestamps (with time), falling back to date strings or timestamp IDs.
 */
export function getTransactionTimestamp(t: { transactionDate?: string; createdAt?: string; id?: number | string }): number {
  if (t.createdAt && t.createdAt.includes('T')) {
    const time = new Date(t.createdAt).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  if (t.transactionDate && t.transactionDate.includes('T')) {
    const time = new Date(t.transactionDate).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  if (t.transactionDate) {
    const time = new Date(t.transactionDate).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  if (t.createdAt) {
    const time = new Date(t.createdAt).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  const numId = Number(t.id);
  if (numId > 1500000000000 && numId < 2500000000000) return numId;
  return numId || 0;
}

/**
 * Sorts transactions chronologically ascending (oldest to newest)
 * for progressive running balance accumulation.
 */
export function sortTransactionsChronologicalAsc(list: FinancialTransaction[]): FinancialTransaction[] {
  return [...list].sort((a, b) => {
    const timeA = getTransactionTimestamp(a);
    const timeB = getTransactionTimestamp(b);
    if (timeA !== timeB) return timeA - timeB;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/**
 * Sorts transactions chronologically descending (newest to oldest)
 * for table displays, ensuring the top row matches the account current balance.
 */
export function sortTransactionsChronologicalDesc(list: FinancialTransaction[]): FinancialTransaction[] {
  return [...list].sort((a, b) => {
    const timeA = getTransactionTimestamp(a);
    const timeB = getTransactionTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

/**
 * Computes chronological running balance for a specific account.
 * Outflow/withdrawal impacts are recorded as negative values internally for math,
 * but amounts are cleanly non-negative.
 */
export function computeAccountRunningBalances(
  account: Account,
  transactions: FinancialTransaction[]
): Map<number, RunningBalanceInfo> {
  const map = new Map<number, RunningBalanceInfo>();
  if (!account) return map;

  let current = parseFloat(String(account.openingBalance || 0)) || 0;

  // Filter and sort chronologically ascending
  const sorted = sortTransactionsChronologicalAsc(
    transactions.filter(t => Number(t.accountId) === Number(account.id))
  );

  sorted.forEach(t => {
    const amt = Math.abs(parseFloat(String(t.amount || 0)) || 0);
    let impact = 0;

    if (t.type === 'deposit' || t.type === 'transfer_in' || t.type === 'payment') {
      impact = amt;
    } else if (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'expense') {
      impact = -amt;
    }

    const before = current;
    current = Math.round((current + impact) * 100) / 100;

    map.set(t.id, {
      balanceBefore: before,
      balanceAfter: current,
      impact,
      changeType: impact > 0 ? 'increase' : impact < 0 ? 'decrease' : 'neutral'
    });
  });

  return map;
}

/**
 * Computes chronological running balance for all accounts at once,
 * returning a Map keyed by transaction ID.
 */
export function computeAllAccountsRunningBalances(
  accounts: Account[],
  transactions: FinancialTransaction[]
): Map<number, RunningBalanceInfo> {
  const fullMap = new Map<number, RunningBalanceInfo>();

  accounts.forEach(acc => {
    const accMap = computeAccountRunningBalances(acc, transactions);
    accMap.forEach((val, key) => {
      fullMap.set(key, val);
    });
  });

  return fullMap;
}
