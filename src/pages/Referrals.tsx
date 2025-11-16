import { useState, useEffect } from 'react';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

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
    rank: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Generate referral code from user ID
        setReferralCode(session.user.id.slice(0, 8));
        // In a real app, fetch actual stats from database
        loadReferralStats(session.user.id);
      }
    });
  }, []);

  const loadReferralStats = async (userId: string) => {
    // Placeholder for loading real stats from database
    // In production, you would query a referrals table
    setStats({
      totalReferrals: 0,
      earnings: 0,
      commissionRate: 5,
      rank: 0
    });
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
    { label: 'Earnings', value: `$${stats.earnings.toLocaleString()}`, icon: '💰' },
    { label: 'Commission Rate', value: `${stats.commissionRate}%`, icon: '📈' },
    { label: 'Rank', value: stats.rank > 0 ? `#${stats.rank}` : 'N/A', icon: '🏆' }
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
          
          <div className="glass-effect p-8 rounded-xl space-y-8">
            <h2 className="font-orbitron text-3xl font-bold text-accent text-center">
              🚀 Your Referral Dashboard
            </h2>
            
            {/* Stats Grid */}
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

            {/* Referral Link Section */}
            <div className="space-y-4">
              <p className="text-xl text-center text-foreground/90">
                🎯 Share your link and earn 5% from every ticket purchase!
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
