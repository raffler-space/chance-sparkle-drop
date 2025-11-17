import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket as TicketIcon, ExternalLink, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';

interface Ticket {
  id: string;
  ticket_number: number;
  quantity: number;
  purchase_price: number;
  purchased_at: string;
  tx_hash: string;
  wallet_address: string;
  raffles: {
    id: number;
    name: string;
    status: string;
    prize_description: string;
    contract_raffle_id?: number | null;
  };
}

export const UserTickets = ({ userId }: { userId: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { account, chainId } = useWeb3();
  const { getUserEntries, isContractReady } = useRaffleContract(chainId, account);

  useEffect(() => {
    fetchTickets();
  }, [userId, account, isContractReady]);

  const fetchTickets = async () => {
    setLoading(true);
    
    // Try to fetch from database first (for authenticated users)
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        raffles (
          id,
          name,
          status,
          prize_description,
          contract_raffle_id
        )
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets from database:', error);
    }
    
    // If user has wallet but no database tickets, fetch from blockchain
    if ((!data || data.length === 0) && account && isContractReady) {
      await fetchBlockchainTickets();
    } else {
      setTickets((data as any) || []);
    }
    
    setLoading(false);
  };

  const fetchBlockchainTickets = async () => {
    if (!account || !isContractReady) return;

    try {
      // Fetch all raffles to check for tickets
      const { data: raffles } = await supabase
        .from('raffles')
        .select('*')
        .not('contract_raffle_id', 'is', null);

      if (!raffles) return;

      const blockchainTickets: Ticket[] = [];
      
      for (const raffle of raffles) {
        if (raffle.contract_raffle_id !== null && raffle.contract_raffle_id !== undefined) {
          const entries = await getUserEntries(raffle.contract_raffle_id, account);
          
          if (entries.length > 0) {
            // Create ticket records for each entry
            entries.forEach((entryId: number) => {
              blockchainTickets.push({
                id: `blockchain-${raffle.id}-${entryId}`,
                ticket_number: entryId,
                quantity: 1,
                purchase_price: raffle.ticket_price,
                purchased_at: raffle.created_at,
                tx_hash: '',
                wallet_address: account,
                raffles: {
                  id: raffle.id,
                  name: raffle.name,
                  status: raffle.status || 'active',
                  prize_description: raffle.prize_description,
                  contract_raffle_id: raffle.contract_raffle_id,
                },
              });
            });
          }
        }
      }

      setTickets(blockchainTickets);
    } catch (error) {
      console.error('Error fetching blockchain tickets:', error);
    }
  };

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
        <TicketIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground font-rajdhani">
          {account ? 'No tickets found for this wallet' : "You haven't purchased any tickets yet"}
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
              <TicketIcon className="w-5 h-5 text-neon-cyan" />
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

          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Purchased {formatDistanceToNow(new Date(ticket.purchased_at), { addSuffix: true })}</span>
          </div>

          {ticket.tx_hash && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-neon-cyan/30 hover:border-neon-cyan"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${ticket.tx_hash}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              View Transaction
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
};
