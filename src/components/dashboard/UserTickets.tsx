import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket as TicketIcon, ExternalLink, Loader2, Clock, ChevronDown, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDistanceToNow } from 'date-fns';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { getBlockExplorerUrl } from '@/utils/blockExplorer';

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
    winner_address?: string | null;
  };
}

interface GroupedRaffle {
  raffle: Ticket['raffles'];
  tickets: Ticket[];
  totalTickets: number;
  totalSpent: number;
  isWinner: boolean;
}

export const UserTickets = ({ userId }: { userId: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRaffles, setExpandedRaffles] = useState<Set<number>>(new Set());
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
          contract_raffle_id,
          winner_address
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
                  winner_address: raffle.winner_address,
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

  const groupTicketsByRaffle = (): GroupedRaffle[] => {
    const grouped = tickets.reduce((acc, ticket) => {
      const raffleId = ticket.raffles.id;
      
      if (!acc[raffleId]) {
        acc[raffleId] = {
          raffle: ticket.raffles,
          tickets: [],
          totalTickets: 0,
          totalSpent: 0,
          isWinner: false,
        };
      }
      
      acc[raffleId].tickets.push(ticket);
      acc[raffleId].totalTickets += ticket.quantity;
      acc[raffleId].totalSpent += ticket.purchase_price * ticket.quantity;
      
      // Check if user won this raffle
      if (ticket.raffles.status === 'completed' && ticket.raffles.winner_address && account) {
        const hasWinningTicket = acc[raffleId].tickets.some(t => 
          ticket.raffles.winner_address?.toLowerCase() === account.toLowerCase()
        );
        acc[raffleId].isWinner = hasWinningTicket;
      }
      
      return acc;
    }, {} as Record<number, GroupedRaffle>);

    return Object.values(grouped).sort((a, b) => {
      // Sort by status: active first, then completed
      if (a.raffle.status === 'active' && b.raffle.status !== 'active') return -1;
      if (a.raffle.status !== 'active' && b.raffle.status === 'active') return 1;
      return 0;
    });
  };

  const toggleRaffle = (raffleId: number) => {
    setExpandedRaffles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(raffleId)) {
        newSet.delete(raffleId);
      } else {
        newSet.add(raffleId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge className="bg-muted text-muted-foreground">✓ Completed</Badge>;
    if (status === 'active') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 LIVE</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

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

  const groupedRaffles = groupTicketsByRaffle();

  return (
    <div className="space-y-4">
      {groupedRaffles.map((group) => {
        const isExpanded = expandedRaffles.has(group.raffle.id);
        const isCompleted = group.raffle.status === 'completed';
        
        return (
          <Collapsible
            key={group.raffle.id}
            open={isExpanded}
            onOpenChange={() => toggleRaffle(group.raffle.id)}
          >
            <Card className="glass-card border-neon-cyan/30 hover:border-neon-cyan/60 transition-all">
              <CollapsibleTrigger className="w-full">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <TicketIcon className="w-6 h-6 text-neon-cyan flex-shrink-0" />
                      <div className="text-left">
                        <h3 className="font-orbitron font-bold text-lg mb-1">{group.raffle.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{group.raffle.prize_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {isCompleted && (
                        group.isWinner ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Trophy className="w-3 h-3 mr-1" />
                            WON
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            LOST
                          </Badge>
                        )
                      )}
                      {getStatusBadge(group.raffle.status)}
                      <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Tickets Owned</p>
                      <p className="font-rajdhani font-bold text-neon-cyan text-lg">{group.totalTickets}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Total Spent</p>
                      <p className="font-rajdhani font-bold text-neon-gold text-lg">{group.totalSpent.toFixed(2)} USDT</p>
                    </div>
                    <div className="text-right">
                      <Link 
                        to={`/raffle/${group.raffle.id}`}
                        className="text-neon-cyan hover:text-neon-cyan/80 font-rajdhani font-bold inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Raffle
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/50 px-6 pb-6 pt-4">
                  <h4 className="font-rajdhani font-bold text-sm text-muted-foreground mb-3">Your Tickets</h4>
                  <div className="space-y-2">
                    {group.tickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-orbitron font-bold text-neon-cyan">#{ticket.ticket_number}</div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Qty:</span>
                            <span className="font-rajdhani font-bold ml-1">{ticket.quantity}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-rajdhani font-bold text-neon-gold ml-1">{ticket.purchase_price} USDT</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.purchased_at), { addSuffix: true })}
                          </div>
                          {ticket.tx_hash && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(getBlockExplorerUrl(chainId, 'tx', ticket.tx_hash), '_blank');
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};
