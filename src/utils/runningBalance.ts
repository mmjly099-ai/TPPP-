import { Account, FinancialTransaction } from '../types';

export interface RunningBalanceInfo {
  balanceBefore: number;
  balanceAfter: number;
  impact: number;
  changeType: 'increase' | 'decrease' | 'neutral';
}

/**
 * Computes chronological running balance for a specific account
 */
export function computeAccountRunningBalances(
  account: Account,
  transactions: FinancialTransaction[]
): Map<number, RunningBalanceInfo> {
  const map = new Map<number, RunningBalanceInfo>();
  if (!account) return map;

  let current = parseFloat(String(account.openingBalance || 0)) || 0;

  // Filter and sort chronologically ascending
  const sorted = [...transactions]
    .filter(t => Number(t.accountId) === Number(account.id))
    .sort((a, b) => {
      const timeA = new Date(a.transactionDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.transactionDate || b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

  sorted.forEach(t => {
    const amt = parseFloat(String(t.amount || 0)) || 0;
    let impact = 0;

    if (t.type === 'deposit' || t.type === 'transfer_in' || t.type === 'payment') {
      impact = amt;
    } else if (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'expense') {
      impact = -amt;
    } else if (t.type === 'other') {
      const desc = (t.description || '').toLowerCase();
      if (desc.includes('سحب') || desc.includes('مصروف') || desc.includes('تكلفة') || desc.includes('توصيل')) {
        impact = -amt;
      } else if (desc.includes('إيداع') || desc.includes('قبض') || desc.includes('تحصيل')) {
        impact = amt;
      }
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
