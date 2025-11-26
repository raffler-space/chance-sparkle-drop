import { useState, useEffect } from 'react';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ReferralTierDisplay } from '@/components/referrals/ReferralTierDisplay';
import { DailyQuestsPanel } from '@/components/referrals/DailyQuestsPanel';
import { MultiTierStats } from '@/components/referrals/MultiTierStats';

interface ReferralsProps {
  account: string | null;
  isConnecting: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export default function Referrals({ account, isConnecting, onConnectWallet, onDisconnectWallet }: ReferralsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    earnings: 0,
    commissionRate: 5,
    rank: 0,
    totalPoints: 0,
    tier1Referrals: 0,
    tier2Referrals: 0,
    tier3Referrals: 0
  });
  const [tiers, setTiers] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setReferralCode(session.user.id.slice(0, 8));
        loadReferralStats(session.user.id);
        loadTiers();
        loadQuests(session.user.id);
      }
    });
  }, []);

  const loadReferralStats = async (userId: string) => {
    try {
      // Get tier-based referrals (exclude self-referrals)
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('referral_tier')
        .eq('referrer_id', userId)
        .eq('is_self_referral', false);

      if (refError) throw refError;

      const tier1 = referrals?.filter(r => r.referral_tier === 1).length || 0;
      const tier2 = referrals?.filter(r => r.referral_tier === 2).length || 0;
      const tier3 = referrals?.filter(r => r.referral_tier === 3).length || 0;

      // Get earnings (money from ticket purchases)
      const { data: earnings, error: earnError } = await supabase
        .from('referral_earnings')
        .select('amount')
        .eq('referrer_id', userId);

      if (earnError) throw earnError;

      const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Get total points
      const { data: points, error: pointsError } = await supabase
        .from('referral_points')
        .select('points_earned')
        .eq('user_id', userId);

      if (pointsError) throw pointsError;

      const totalPoints = points?.reduce((sum, p) => sum + Number(p.points_earned), 0) || 0;

      // Get leaderboard position (based on points)
      const { data: allPoints, error: leaderError } = await supabase
        .from('referral_points')
        .select('user_id, points_earned');

      if (leaderError) throw leaderError;

      const pointsByUser = allPoints?.reduce((acc, p) => {
        acc[p.user_id] = (acc[p.user_id] || 0) + Number(p.points_earned);
        return acc;
      }, {} as Record<string, number>) || {};

      const sortedUsers = Object.entries(pointsByUser)
        .sort(([, a], [, b]) => b - a);
      
      const userRank = sortedUsers.findIndex(([id]) => id === userId) + 1;

      setStats({
        totalReferrals: tier1 + tier2 + tier3,
        earnings: totalEarnings,
        commissionRate: 5,
        rank: userRank,
        totalPoints,
        tier1Referrals: tier1,
        tier2Referrals: tier2,
        tier3Referrals: tier3
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
      toast({
        title: "Error loading stats",
        description: "Failed to load referral statistics",
        variant: "destructive",
      });
    }
  };

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  };

  const loadQuests = async (userId: string) => {
    try {
      const { data: questsData, error: questsError } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('active', true);

      if (questsError) throw questsError;
      setQuests(questsData || []);

      // Get today's completed quests
      const today = new Date().toISOString().split('T')[0];
      const { data: completions, error: completionsError } = await supabase
        .from('user_quest_completions')
        .select('quest_id')
        .eq('user_id', userId)
        .eq('completed_date', today);

      if (completionsError) throw completionsError;
      setCompletedQuests(new Set(completions?.map(c => c.quest_id) || []));
    } catch (error) {
      console.error('Error loading quests:', error);
    }
  };

  const referralLink = user 
    ? `${window.location.origin}/ref/${referralCode}`
    : `${window.location.origin}/ref/yourcode`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied! 🎉",
      description: "Your referral link has been copied to clipboard",
    });
  };

  const shareToSocial = (platform: string) => {
    const text = encodeURIComponent("Join me on Raffler and win luxury prizes! Use my referral link:");
    const url = encodeURIComponent(referralLink);
    
    const socialUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    };

    if (socialUrls[platform]) {
      window.open(socialUrls[platform], '_blank');
    }
  };

  const statCards = [
    { label: 'Total Referrals', value: stats.totalReferrals.toString(), icon: '👥' },
    { label: 'Points', value: stats.totalPoints.toLocaleString(), icon: '⭐' },
    { label: 'Cash Earnings', value: `$${stats.earnings.toLocaleString()}`, icon: '💰' },
    { label: 'Leaderboard Rank', value: stats.rank > 0 ? `#${stats.rank}` : 'N/A', icon: '🏆' }
  ];

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Navbar 
        onConnectWallet={onConnectWallet}
        onDisconnectWallet={onDisconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-orbitron font-black text-center mb-16 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            💸 EARN REFERRALS
          </h1>
          
          <div className="space-y-8">
            {/* Tier Display */}
            {user && tiers.length > 0 && (
              <ReferralTierDisplay currentPoints={stats.totalPoints} tiers={tiers} />
            )}

            {/* Stats Grid */}
            <div className="glass-effect p-6 rounded-xl">
              <h2 className="font-orbitron text-2xl font-bold text-accent text-center mb-6">
                📊 Your Stats
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center p-6 bg-background/30 rounded-xl"
                  >
                    <div className="text-4xl mb-2">{stat.icon}</div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Tier Stats */}
            {user && (
              <MultiTierStats 
                stats={{
                  tier1: stats.tier1Referrals,
                  tier2: stats.tier2Referrals,
                  tier3: stats.tier3Referrals
                }} 
              />
            )}

            {/* Daily Quests */}
            {user && quests.length > 0 && (
              <DailyQuestsPanel
                quests={quests}
                completedToday={completedQuests}
                onQuestComplete={() => user && loadQuests(user.id)}
                referralLink={referralLink}
              />
            )}

            {/* Future Rewards Teaser */}
            <div className="glass-effect p-6 rounded-xl border-2 border-accent/30">
              <h3 className="text-xl font-orbitron font-bold text-center text-accent mb-4">
                🎁 Coming Soon: Exclusive Rewards
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-background/30 rounded-lg">
                  <div className="text-3xl mb-2">🎟️</div>
                  <div className="font-semibold">Free Raffle Entries</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Redeem points for free tickets
                  </div>
                </div>
                <div className="p-4 bg-background/30 rounded-lg">
                  <div className="text-3xl mb-2">💵</div>
                  <div className="font-semibold">Cash Prizes</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Top performers get cash rewards
                  </div>
                </div>
                <div className="p-4 bg-background/30 rounded-lg">
                  <div className="text-3xl mb-2">👑</div>
                  <div className="font-semibold">VIP Access</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Exclusive raffles for top tiers
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Link Section */}
            <div className="glass-effect p-6 rounded-xl space-y-4">
              <h3 className="text-xl font-orbitron font-bold text-center text-accent">
                🎯 Your Referral Link
              </h3>
              <p className="text-center text-foreground/90">
                Earn 100 points per direct referral + 5% commission on ticket purchases!
              </p>
              
              <div className="flex gap-2 p-4 bg-background/50 rounded-xl">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-transparent border border-border rounded-lg text-foreground"
                />
                <Button
                  onClick={copyToClipboard}
                  className="bg-gradient-to-r from-secondary to-purple hover:opacity-90 px-6"
                >
                  📋 Copy
                </Button>
              </div>

              {/* Social Share Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: 'twitter', label: '🔗 Twitter' },
                  { name: 'telegram', label: '✈️ Telegram' },
                  { name: 'facebook', label: '📘 Facebook' },
                  { name: 'whatsapp', label: '💬 WhatsApp' }
                ].map((platform) => (
                  <Button
                    key={platform.name}
                    variant="outline"
                    onClick={() => shareToSocial(platform.name)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {platform.label}
                  </Button>
                ))}
              </div>
            </div>

            {!user && (
              <div className="text-center p-6 bg-accent/10 rounded-xl border border-accent/30">
                <p className="text-lg text-foreground/90 mb-4">
                  Sign in to access your personal referral dashboard and start earning!
                </p>
                <Button
                  onClick={() => window.location.href = '/auth'}
                  className="bg-gradient-to-r from-secondary to-purple hover:opacity-90"
                >
                  Sign In to Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
