import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Loader2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Raffle {
  id: number;
  name: string;
  description: string;
  prize_description: string;
  ticket_price: number;
  max_tickets: number;
  tickets_sold: number;
  status: string;
  draw_date: string | null;
  image_url: string | null;
}

export const ActiveRaffles = ({ userId }: { userId: string }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [participatingRaffleIds, setParticipatingRaffleIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all active raffles
      const { data: rafflesData } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Fetch user's tickets to see which raffles they're participating in
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('raffle_id')
        .eq('user_id', userId);

      if (rafflesData) setRaffles(rafflesData);
      if (ticketsData) {
        setParticipatingRaffleIds(new Set(ticketsData.map(t => t.raffle_id)));
      }
      
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  const participatingRaffles = raffles.filter(r => participatingRaffleIds.has(r.id));

  if (participatingRaffles.length === 0) {
    return (
      <Card className="glass-card border-neon-purple/30 p-8 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground font-rajdhani">
          You're not participating in any active raffles
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {participatingRaffles.map((raffle) => {
        const progress = (raffle.tickets_sold / raffle.max_tickets) * 100;
        
        return (
          <Card key={raffle.id} className="glass-card border-neon-purple/30 p-6 hover:border-neon-purple/60 transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              {raffle.image_url && (
                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={raffle.image_url} 
                    alt={raffle.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-orbitron font-bold text-2xl mb-2 text-neon-purple">
                      {raffle.name}
                    </h3>
                    <p className="text-muted-foreground font-rajdhani">
                      {raffle.description}
                    </p>
                  </div>
                  <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
                    <Trophy className="w-3 h-3 mr-1" />
                    Participating
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-rajdhani">Prize</span>
                    <span className="font-rajdhani font-bold text-neon-gold">
                      {raffle.prize_description}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-rajdhani">Progress</span>
                      <span className="font-rajdhani">
                        {raffle.tickets_sold} / {raffle.max_tickets} tickets
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {raffle.draw_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="font-rajdhani">
                        Draw {formatDistanceToNow(new Date(raffle.draw_date), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
