import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Trophy, Loader2, BarChart3, Wallet, Package, DollarSign, FileText, RefreshCcw } from 'lucide-react';
import { RaffleManagement } from '@/components/admin/RaffleManagement';
import { WinnerSelection } from '@/components/admin/WinnerSelection';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { WithdrawFees } from '@/components/admin/WithdrawFees';
import { PrizeClaimsManager } from '@/components/admin/PrizeClaimsManager';
import ReferralPayouts from '@/components/admin/ReferralPayouts';
import RaffleDetailsManager from '@/components/admin/RaffleDetailsManager';
import { RefundManager } from '@/components/admin/RefundManager';
import { useWeb3 } from '@/hooks/useWeb3';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to access the admin panel');
        navigate('/');
        return;
      }

      // Check if user has admin role
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error || !roleData) {
        toast.error('You do not have admin access');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 text-foreground">
        <AnimatedBackground />
        <Navbar 
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
          walletAddress={account}
          isConnecting={isConnecting}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-dark-900 text-foreground">
      <AnimatedBackground />
      <Navbar 
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <main className="relative z-10 container mx-auto px-4 py-8 mt-20">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="w-10 h-10 text-neon-cyan" />
          <div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-neon-cyan glow-text-cyan">
              Admin Panel
            </h1>
            <p className="text-muted-foreground font-rajdhani text-lg">
              Manage raffles and trigger winner selections
            </p>
          </div>
        </div>

        <Tabs defaultValue="raffles" className="space-y-6">
          <TabsList className="glass-card border-neon-cyan/30 p-1">
            <TabsTrigger 
              value="raffles" 
              className="font-rajdhani data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Raffles
            </TabsTrigger>
            <TabsTrigger 
              value="winners"
              className="font-rajdhani data-[state=active]:bg-neon-gold/20 data-[state=active]:text-neon-gold"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Select Winners
            </TabsTrigger>
            <TabsTrigger 
              value="details"
              className="font-rajdhani data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Raffle Details
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="font-rajdhani data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="fees"
              className="font-rajdhani data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Fees
            </TabsTrigger>
            <TabsTrigger 
              value="claims"
              className="font-rajdhani data-[state=active]:bg-neon-gold/20 data-[state=active]:text-neon-gold"
            >
              <Package className="w-4 h-4 mr-2" />
              Prize Claims
            </TabsTrigger>
            <TabsTrigger 
              value="referrals"
              className="font-rajdhani data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Referral Payouts
            </TabsTrigger>
            <TabsTrigger 
              value="refunds"
              className="font-rajdhani data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refunds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raffles" className="space-y-4">
            <RaffleManagement />
          </TabsContent>

          <TabsContent value="winners" className="space-y-4">
            <WinnerSelection />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <RaffleDetailsManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <WithdrawFees />
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            <PrizeClaimsManager />
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <ReferralPayouts />
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            <RefundManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
