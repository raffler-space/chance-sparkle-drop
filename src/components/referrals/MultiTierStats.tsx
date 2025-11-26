interface TierStats {
  tier1: number;
  tier2: number;
  tier3: number;
}

interface MultiTierStatsProps {
  stats: TierStats;
}

export function MultiTierStats({ stats }: MultiTierStatsProps) {
  const tiers = [
    { level: 1, count: stats.tier1, points: 100, icon: '👥', label: 'Direct Referrals' },
    { level: 2, count: stats.tier2, points: 50, icon: '🔗', label: 'Second Tier' },
    { level: 3, count: stats.tier3, points: 25, icon: '⛓️', label: 'Third Tier' },
  ];

  return (
    <div className="glass-effect p-6 rounded-xl space-y-4">
      <h3 className="text-xl font-orbitron font-bold text-center text-accent">
        Multi-Tier Referral Network
      </h3>
      
      <div className="grid gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.level}
            className="flex items-center justify-between p-4 bg-background/30 rounded-lg border border-border/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{tier.icon}</span>
              <div>
                <div className="font-semibold">{tier.label}</div>
                <div className="text-sm text-muted-foreground">
                  {tier.points} points per referral
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{tier.count}</div>
              <div className="text-xs text-muted-foreground">referrals</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border/50">
        💡 Your referrals' referrals also count towards your points!
      </div>
    </div>
  );
}
