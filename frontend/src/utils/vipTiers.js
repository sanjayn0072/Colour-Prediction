export const VIP_TIERS = [
  { level: 1, minDeposit: 100, levelUp: 2, weekly: 2, monthly: 5, commission: 0 },
  { level: 2, minDeposit: 200, levelUp: 3, weekly: 4, monthly: 10, commission: 0 },
  { level: 3, minDeposit: 500, levelUp: 5, weekly: 8, monthly: 20, commission: 0 },
  { level: 4, minDeposit: 1000, levelUp: 10, weekly: 15, monthly: 40, commission: 0 },
  { level: 5, minDeposit: 2000, levelUp: 20, weekly: 25, monthly: 70, commission: 0.5 },
  { level: 6, minDeposit: 5000, levelUp: 45, weekly: 50, monthly: 120, commission: 0.6 },
  { level: 7, minDeposit: 10000, levelUp: 80, weekly: 90, monthly: 200, commission: 0.7 },
  { level: 8, minDeposit: 15000, levelUp: 120, weekly: 130, monthly: 280, commission: 0.8 },
  { level: 9, minDeposit: 20000, levelUp: 160, weekly: 170, monthly: 360, commission: 0.9 },
  { level: 10, minDeposit: 30000, levelUp: 240, weekly: 220, monthly: 460, commission: 1.0 },
  { level: 11, minDeposit: 45000, levelUp: 350, weekly: 300, monthly: 600, commission: 1.1 },
  { level: 12, minDeposit: 60000, levelUp: 450, weekly: 400, monthly: 800, commission: 1.2 },
  { level: 13, minDeposit: 80000, levelUp: 600, weekly: 500, monthly: 1000, commission: 1.3 },
  { level: 14, minDeposit: 100000, levelUp: 750, weekly: 600, monthly: 1200, commission: 1.4 },
  { level: 15, minDeposit: 130000, levelUp: 950, weekly: 750, monthly: 1500, commission: 1.5 },
  { level: 16, minDeposit: 160000, levelUp: 1150, weekly: 900, monthly: 1800, commission: 1.6 },
  { level: 17, minDeposit: 200000, levelUp: 1400, weekly: 1050, monthly: 2100, commission: 1.7 },
  { level: 18, minDeposit: 230000, levelUp: 1600, weekly: 1200, monthly: 2400, commission: 1.8 },
  { level: 19, minDeposit: 260000, levelUp: 1800, weekly: 1350, monthly: 2700, commission: 1.9 },
  { level: 20, minDeposit: 300000, levelUp: 2000, weekly: 1500, monthly: 3000, commission: 2.0 }
]

export function getVipLevel(totalDeposit) {
  let level = 0
  for (let i = 0; i < VIP_TIERS.length; i++) {
    if (totalDeposit >= VIP_TIERS[i].minDeposit) {
      level = VIP_TIERS[i].level
    } else {
      break
    }
  }
  return level
}

export function getVipLimit(vipLevel) {
  if (vipLevel <= 0) return 0
  const tier = VIP_TIERS.find(t => t.level === vipLevel)
  return tier ? tier.minDeposit * 30 : 0
}
