import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, DollarSign, Users, Trophy, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  activeUsers: number;
  totalRaffles: number;
  completedRaffles: number;
  averageTicketsSold: number;
}

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch tickets for revenue
      const { data: tickets } = await supabase
        .from('tickets')
        .select('purchase_price, quantity');

      const totalRevenue = tickets?.reduce((sum, t) => sum + (Number(t.purchase_price) * t.quantity), 0) || 0;

      // Fetch unique users from the same tickets data
      const { data: userTickets } = await supabase
        .from('tickets')
        .select('user_id');

      const activeUsers = new Set(userTickets?.map(t => t.user_id)).size;

      // Fetch raffles data
      const { data: raffles } = await supabase
        .from('raffles')
        .select('status, tickets_sold');

      const totalRaffles = raffles?.length || 0;
      const completedRaffles = raffles?.filter(r => r.status === 'completed').length || 0;
      const averageTicketsSold = raffles?.length 
        ? raffles.reduce((sum, r) => sum + r.tickets_sold, 0) / raffles.length 
        : 0;

      setAnalytics({
        totalRevenue,
        activeUsers,
        totalRaffles,
        completedRaffles,
        averageTicketsSold
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
    </div>
  );
};
