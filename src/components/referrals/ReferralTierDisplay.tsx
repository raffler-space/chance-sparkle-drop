import { Progress } from '@/components/ui/progress';

interface Tier {
  tier_name: string;
  tier_level: number;
  required_points: number;
  icon: string;
  benefits: string;
}

interface ReferralTierDisplayProps {
  currentPoints: number;
  tiers: Tier[];
}

export function ReferralTierDisplay({ currentPoints, tiers }: ReferralTierDisplayProps) {
  // Find current tier
  const currentTier = [...tiers]
    .sort((a, b) => b.required_points - a.required_points)
    .find(tier => currentPoints >= tier.required_points) || tiers[0];

  // Find next tier
  const nextTier = tiers.find(tier => tier.required_points > currentPoints);

  const progressToNext = nextTier
    ? ((currentPoints - currentTier.required_points) / (nextTier.required_points - currentTier.required_points)) * 100
    : 100;

  return (
    <div className="glass-effect p-6 rounded-xl space-y-4">
      <div className="text-center">
        <div className="text-6xl mb-2">{currentTier.icon}</div>
        <h3 className="text-2xl font-orbitron font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {currentTier.tier_name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{currentTier.benefits}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Points</span>
          <span className="font-bold text-primary">{currentPoints.toLocaleString()}</span>
        </div>
        
        {nextTier && (
          <>
            <Progress value={progressToNext} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentTier.required_points.toLocaleString()}</span>
              <span>Next: {nextTier.tier_name} {nextTier.icon}</span>
              <span>{nextTier.required_points.toLocaleString()}</span>
            </div>
          </>
        )}

        {!nextTier && (
          <div className="text-center text-accent font-semibold mt-2">
            🎉 Maximum Tier Achieved! 🎉
          </div>
        )}
      </div>

      {/* All tiers preview */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-4 border-t border-border/50">
        {tiers.map((tier) => (
          <div
            key={tier.tier_level}
            className={`text-center p-2 rounded-lg transition-all ${
              currentPoints >= tier.required_points
                ? 'bg-primary/20 border border-primary/50'
                : 'bg-background/30 opacity-50'
            }`}
          >
            <div className="text-2xl">{tier.icon}</div>
            <div className="text-xs font-medium mt-1">{tier.tier_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
