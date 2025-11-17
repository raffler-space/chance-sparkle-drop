import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, DollarSign, Users, Trophy, TrendingUp, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface LeaderboardEntry {
  walletAddress: string;
  rafflesParticipated: number;
  totalSpent: number;
  wins: number;
  losses: number;
  winRate: number;
  ticketsPurchased: number;
}

type SortField = 'rafflesParticipated' | 'totalSpent' | 'winRate' | 'ticketsPurchased';
type SortDirection = 'asc' | 'desc';

export const AdminAnalytics = () => {
  const { account, chainId } = useWeb3();
  const raffleContract = useRaffleContract(chainId, account);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalSpent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchAnalytics();
    fetchLeaderboard();
  }, [raffleContract.isContractReady]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all ticket data in one query for consistency
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('purchase_price, quantity, wallet_address');

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
      }

      const totalRevenue = tickets?.reduce((sum, t) => sum + (Number(t.purchase_price) * t.quantity), 0) || 0;
      const activeUsers = tickets ? new Set(tickets.map(t => t.wallet_address).filter(addr => addr)).size : 0;

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

  const fetchLeaderboard = async () => {
    try {
      // Fetch all tickets with wallet addresses
      const { data: tickets } = await supabase
        .from('tickets')
        .select('wallet_address, purchase_price, quantity, raffle_id');

      // Fetch raffles to determine winners
      const { data: raffles } = await supabase
        .from('raffles')
        .select('id, winner_address, status');

      if (!tickets) return;

      // Group by wallet address
      interface WalletStatsTemp {
        walletAddress: string;
        rafflesParticipated: Set<number>;
        totalSpent: number;
        wins: number;
        losses: number;
        winRate: number;
        ticketsPurchased: number;
      }

      const walletStats = new Map<string, WalletStatsTemp>();

      tickets.forEach(ticket => {
        const addr = ticket.wallet_address;
        if (!addr) return;

        const existing = walletStats.get(addr) || {
          walletAddress: addr,
          rafflesParticipated: new Set<number>(),
          totalSpent: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          ticketsPurchased: 0,
        };

        existing.rafflesParticipated.add(ticket.raffle_id);
        existing.totalSpent += Number(ticket.purchase_price) * ticket.quantity;
        existing.ticketsPurchased += ticket.quantity;

        walletStats.set(addr, existing);
      });

      // Calculate wins and losses
      raffles?.forEach(raffle => {
        if (raffle.status === 'completed' && raffle.winner_address) {
          const entry = walletStats.get(raffle.winner_address);
          if (entry) {
            entry.wins += 1;
          }
        }
      });

      // Calculate losses and win rate
      const leaderboardData: LeaderboardEntry[] = Array.from(walletStats.values()).map(entry => {
        const rafflesCount = entry.rafflesParticipated.size;
        const completedRafflesParticipated = raffles?.filter(r => 
          r.status === 'completed' && 
          tickets.some(t => t.wallet_address === entry.walletAddress && t.raffle_id === r.id)
        ).length || 0;
        
        const losses = completedRafflesParticipated - entry.wins;
        const winRate = completedRafflesParticipated > 0 ? (entry.wins / completedRafflesParticipated) * 100 : 0;

        return {
          walletAddress: entry.walletAddress,
          rafflesParticipated: rafflesCount,
          totalSpent: entry.totalSpent,
          wins: entry.wins,
          losses: losses,
          winRate: winRate,
          ticketsPurchased: entry.ticketsPurchased,
        };
      });

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (!analytics) return null;

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

      {/* Leaderboard Section */}
      <Card className="glass-card border-neon-cyan/30 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-orbitron font-bold text-neon-cyan">Participant Leaderboard</h3>
            <Trophy className="w-6 h-6 text-neon-gold" />
          </div>
          
          {sortedLeaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground font-rajdhani">Wallet</TableHead>
                    <TableHead 
                      className="text-muted-foreground font-rajdhani cursor-pointer hover:text-neon-cyan"
                      onClick={() => handleSort('rafflesParticipated')}
                    >
                      <div className="flex items-center gap-1">
                        Raffles Participated
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-muted-foreground font-rajdhani cursor-pointer hover:text-neon-cyan"
                      onClick={() => handleSort('ticketsPurchased')}
                    >
                      <div className="flex items-center gap-1">
                        Tickets Purchased
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-muted-foreground font-rajdhani cursor-pointer hover:text-neon-cyan"
                      onClick={() => handleSort('totalSpent')}
                    >
                      <div className="flex items-center gap-1">
                        Total Spent (USDT)
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Wins</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Losses</TableHead>
                    <TableHead 
                      className="text-muted-foreground font-rajdhani cursor-pointer hover:text-neon-cyan"
                      onClick={() => handleSort('winRate')}
                    >
                      <div className="flex items-center gap-1">
                        Win Rate
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderboard.map((entry, index) => (
                    <TableRow key={entry.walletAddress} className="border-border/30">
                      <TableCell className="font-mono text-sm">
                        {formatWalletAddress(entry.walletAddress)}
                      </TableCell>
                      <TableCell className="font-rajdhani">{entry.rafflesParticipated}</TableCell>
                      <TableCell className="font-rajdhani">{entry.ticketsPurchased}</TableCell>
                      <TableCell className="font-rajdhani text-neon-gold">
                        {entry.totalSpent.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-rajdhani text-green-500">{entry.wins}</TableCell>
                      <TableCell className="font-rajdhani text-red-500">{entry.losses}</TableCell>
                      <TableCell className="font-rajdhani text-neon-cyan">
                        {entry.winRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No participant data available yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
