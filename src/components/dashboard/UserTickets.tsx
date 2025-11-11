import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Ticket {
  id: string;
  ticket_number: number;
  quantity: number;
  purchase_price: number;
  purchased_at: string;
  tx_hash: string;
  raffles: {
    name: string;
    status: string;
    prize_description: string;
  };
}

export const UserTickets = ({ userId }: { userId: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          raffles (
            name,
            status,
            prize_description
          )
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      if (!error && data) {
        setTickets(data as any);
      }
      setLoading(false);
    };

    fetchTickets();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="glass-card border-neon-cyan/30 p-8 text-center">
        <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground font-rajdhani">
          You haven't purchased any tickets yet
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="glass-card border-neon-cyan/30 p-6 hover:border-neon-cyan/60 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-neon-cyan" />
              <h3 className="font-orbitron font-bold text-lg">#{ticket.ticket_number}</h3>
            </div>
            <Badge 
              variant={ticket.raffles.status === 'active' ? 'default' : 'secondary'}
              className="font-rajdhani"
            >
              {ticket.raffles.status}
            </Badge>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="font-rajdhani text-sm text-muted-foreground">Raffle</p>
            <p className="font-rajdhani font-bold">{ticket.raffles.name}</p>
            <p className="text-sm text-muted-foreground">{ticket.raffles.prize_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-rajdhani font-bold text-neon-cyan">{ticket.quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-rajdhani font-bold text-neon-gold">{ticket.purchase_price} USDT</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-neon-cyan/30 hover:border-neon-cyan"
            onClick={() => window.open(`https://etherscan.io/tx/${ticket.tx_hash}`, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            View Transaction
          </Button>
        </Card>
      ))}
    </div>
  );
};
