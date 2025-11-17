import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, DollarSign, Users, Trophy, TrendingUp } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';

interface AnalyticsData {
  totalRevenue: number;
  activeUsers: number;
  totalRaffles: number;
  completedRaffles: number;
  averageTicketsSold: number;
  totalReferrals?: number;
  pendingPayouts?: number;
  totalPaid?: number;
}

export const AdminAnalytics = () => {
  const { account, chainId } = useWeb3();
  const raffleContract = useRaffleContract(chainId, account);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [raffleContract.isContractReady]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all ticket data in one query for consistency
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('purchase_price, quantity, user_id');

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
      }

      console.log('Fetched tickets:', tickets?.length || 0);
      console.log('Unique user IDs:', tickets ? [...new Set(tickets.map(t => t.user_id))] : []);

      const totalRevenue = tickets?.reduce((sum, t) => sum + (Number(t.purchase_price) * t.quantity), 0) || 0;
      const activeUsers = tickets ? new Set(tickets.map(t => t.user_id).filter(id => id)).size : 0;

      // Fetch raffles data
      const { data: raffles } = await supabase
        .from('raffles')
        .select('status, tickets_sold, contract_raffle_id');

      // Update tickets_sold from blockchain for more accurate data
      const rafflesWithBlockchainData = await Promise.all(
        (raffles || []).map(async (raffle) => {
          if (raffle.contract_raffle_id !== null && raffleContract.isContractReady) {
            const info = await raffleContract.getRaffleInfo(raffle.contract_raffle_id);
            if (info) {
              return { ...raffle, tickets_sold: info.ticketsSold };
            }
          }
          return raffle;
        })
      );

      const totalRaffles = rafflesWithBlockchainData?.length || 0;
      const completedRaffles = rafflesWithBlockchainData?.filter(r => r.status === 'completed').length || 0;
      const averageTicketsSold = rafflesWithBlockchainData?.length 
        ? rafflesWithBlockchainData.reduce((sum, r) => sum + r.tickets_sold, 0) / rafflesWithBlockchainData.length 
        : 0;

      // Fetch referral data
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*');

      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('amount, status');

      const totalReferrals = referrals?.length || 0;
      const pendingPayouts = earnings?.filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalPaid = earnings?.filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setAnalytics({
        totalRevenue,
        activeUsers,
        totalRaffles,
        completedRaffles,
        averageTicketsSold,
        totalReferrals,
        pendingPayouts,
        totalPaid,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-neon-gold/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Total Revenue</p>
              <p className="text-3xl font-orbitron font-bold text-neon-gold">
                {analytics.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">USDT</p>
            </div>
            <DollarSign className="w-12 h-12 text-neon-gold/50" />
          </div>
        </Card>

        <Card className="glass-card border-neon-cyan/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Active Users</p>
              <p className="text-3xl font-orbitron font-bold text-neon-cyan">
                {analytics.activeUsers}
              </p>
              <p className="text-xs text-muted-foreground">Total participants</p>
            </div>
            <Users className="w-12 h-12 text-neon-cyan/50" />
          </div>
        </Card>

        <Card className="glass-card border-neon-purple/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Total Raffles</p>
              <p className="text-3xl font-orbitron font-bold text-neon-purple">
                {analytics.totalRaffles}
              </p>
              <p className="text-xs text-muted-foreground">{analytics.completedRaffles} completed</p>
            </div>
            <Trophy className="w-12 h-12 text-neon-purple/50" />
          </div>
        </Card>

        <Card className="glass-card border-secondary/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Avg Tickets Sold</p>
              <p className="text-3xl font-orbitron font-bold text-secondary">
                {analytics.averageTicketsSold.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Per raffle</p>
            </div>
            <TrendingUp className="w-12 h-12 text-secondary/50" />
          </div>
        </Card>
      </div>

      {/* Referral Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-neon-purple/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Total Referrals</p>
              <p className="text-3xl font-orbitron font-bold text-neon-purple">
                {analytics.totalReferrals || 0}
              </p>
              <p className="text-xs text-muted-foreground">Users referred</p>
            </div>
            <Users className="w-12 h-12 text-neon-purple/50" />
          </div>
        </Card>

        <Card className="glass-card border-neon-gold/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Pending Payouts</p>
              <p className="text-3xl font-orbitron font-bold text-neon-gold">
                {(analytics.pendingPayouts || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">USDT</p>
            </div>
            <DollarSign className="w-12 h-12 text-neon-gold/50" />
          </div>
        </Card>

        <Card className="glass-card border-neon-cyan/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-rajdhani">Total Paid Out</p>
              <p className="text-3xl font-orbitron font-bold text-neon-cyan">
                {(analytics.totalPaid || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">USDT</p>
            </div>
            <TrendingUp className="w-12 h-12 text-neon-cyan/50" />
          </div>
        </Card>
      </div>
    </div>
  );
};
