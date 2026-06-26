/**
 * Withdrawal Fee Calculator
 *
 * Rules:
 * - ₹100 exactly:    9% fee (₹9)
 * - ₹101 – ₹1,000:  ₹9 base (for first ₹100) + 3% on each additional ₹100 increment
 * - Above ₹1,000:    Flat 3% of entire amount
 *
 * Min withdrawal: ₹100 | Max withdrawal: ₹5,000
 */
export function calculateWithdrawalFee(amount) {
  const num = parseFloat(amount)
  if (!num || num <= 0) return { gross: 0, fee: 0, net: 0, feePercent: '0' }

  let fee

  if (num <= 100) {
    fee = num * 0.09
  } else if (num <= 1000) {
    // ₹9 for first ₹100 + 3% on each additional ₹100 block
    fee = 9 + (num - 100) * 0.03
  } else {
    // Flat 3% of total
    fee = num * 0.03
  }

  fee = Math.round(fee * 100) / 100
  const net = Math.round((num - fee) * 100) / 100
  const feePercent = num > 0 ? ((fee / num) * 100).toFixed(1) : '0'

  return { gross: num, fee, net, feePercent }
}

export const WITHDRAW_MIN = 100
export const WITHDRAW_MAX = 5000
