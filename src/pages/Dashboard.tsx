import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Ticket, TrendingUp, History, Loader2, MessageSquare } from 'lucide-react';
import { UserTickets } from '@/components/dashboard/UserTickets';
import { SupportTab } from '@/components/dashboard/SupportTab';
import { ActiveRaffles } from '@/components/dashboard/ActiveRaffles';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';
import { WinnerNotification } from '@/components/dashboard/WinnerNotification';
import { GetTestUSDT } from '@/components/GetTestUSDT';
import { useWeb3 } from '@/hooks/useWeb3';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check authentication - allow access with either email login OR wallet connection
  useEffect(() => {
    if (!loading && !user && !account) {
      toast.error('Please sign in to view your dashboard');
      navigate('/');
    }
  }, [user, account, loading, navigate]);

  // Set loading to false once we've checked auth
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold mb-2 text-neon-cyan glow-text-cyan">
              My Dashboard
            </h1>
            <p className="text-muted-foreground font-rajdhani text-lg">
              Track your tickets, raffles, and transactions
            </p>
          </div>
          <GetTestUSDT />
        </div>

        <WinnerNotification userId={user?.id} />

        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList className="glass-card border-neon-cyan/30 p-1">
            <TabsTrigger 
              value="tickets" 
              className="font-rajdhani data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan"
            >
              <Ticket className="w-4 h-4 mr-2" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger 
              value="raffles"
              className="font-rajdhani data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Active Raffles
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="font-rajdhani data-[state=active]:bg-neon-gold/20 data-[state=active]:text-neon-gold"
            >
              <History className="w-4 h-4 mr-2" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger 
              value="support"
              className="font-rajdhani data-[state=active]:bg-neon-pink/20 data-[state=active]:text-neon-pink"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            <UserTickets userId={user?.id} />
          </TabsContent>

          <TabsContent value="raffles" className="space-y-4">
            <ActiveRaffles userId={user?.id} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <TransactionHistory userId={user?.id} walletAddress={account} />
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <SupportTab userId={user?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
