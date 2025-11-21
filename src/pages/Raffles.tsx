import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { Loader2, Ticket, Trophy, ExternalLink, Loader2 as LoaderIcon } from 'lucide-react';
import { PurchaseModal } from '@/components/PurchaseModal';
import { ethers } from 'ethers';
import { getBlockExplorerUrl } from '@/utils/blockExplorer';

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
  winner_address: string | null;
  image_url: string | null;
  contract_raffle_id: number | null;
  launch_time: string | null;
  display_order: number;
  network: string;
}

export default function Raffles() {
  const navigate = useNavigate();
  const { account, isConnecting, connectWallet, disconnectWallet, chainId } = useWeb3();
  const { contract, isContractReady } = useRaffleContract(chainId, account);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filterView, setFilterView] = useState<'all' | 'live' | 'upcoming'>('all');

  useEffect(() => {
    fetchRaffles();
  }, [isContractReady]);

  // Update time every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll contract state for raffles without winners to sync with blockchain
  useEffect(() => {
    if (!contract || !isContractReady) return;

    const syncRaffleStates = async () => {
      const activeRaffles = raffles.filter(r => r.status === 'active' && !r.winner_address && r.contract_raffle_id !== null);
      
      for (const raffle of activeRaffles) {
        try {
          const contractInfo = await contract.raffles(raffle.contract_raffle_id);
          const winner = contractInfo.winner;
          
          // If winner is set on contract but not in DB, sync it
          if (winner && winner !== ethers.constants.AddressZero && !raffle.winner_address) {
            console.log(`Syncing winner for raffle ${raffle.id}: ${winner}`);
            
            await supabase
              .from('raffles')
              .update({
                status: 'completed',
                winner_address: winner,
                completed_at: new Date().toISOString(),
              })
              .eq('id', raffle.id);
            
            fetchRaffles(); // Refresh the list
          }
        } catch (error) {
          console.error(`Error checking raffle ${raffle.id}:`, error);
        }
      }
    };

    // Initial sync
    syncRaffleStates();

    // Poll every 10 seconds
    const interval = setInterval(syncRaffleStates, 10000);

    return () => clearInterval(interval);
  }, [contract, isContractReady, raffles]);

  const fetchRaffles = async () => {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('show_on_raffles', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching raffles:', error);
    } else if (data) {
      // Fetch blockchain data for accurate ticket counts
      if (isContractReady && contract) {
        const rafflesWithBlockchainData = await Promise.all(
          data.map(async (raffle) => {
            if (raffle.contract_raffle_id !== null && raffle.contract_raffle_id !== undefined) {
              try {
                const contractInfo = await contract.raffles(raffle.contract_raffle_id);
                return { 
                  ...raffle, 
                  tickets_sold: contractInfo.ticketsSold.toNumber() 
                };
              } catch (error) {
                console.error(`Error fetching blockchain data for raffle ${raffle.id}:`, error);
                return raffle;
              }
            }
            return raffle;
          })
        );
        setRaffles(rafflesWithBlockchainData);
      } else {
        setRaffles(data);
      }
    }
    setLoading(false);
  };

  // Filter raffles based on selected view
  const filteredRaffles = filterView === 'all'
    ? raffles
    : filterView === 'upcoming'
    ? raffles.filter(r => r.status === 'draft')
    : raffles.filter(r => r.status !== 'draft');

  const getTimeRemaining = (raffle: Raffle) => {
    // For draft raffles, show countdown to launch
    if (raffle.status === 'draft') {
      if (!raffle.launch_time) return 'Launch Time TBA';
      
      const now = new Date().getTime();
      const launch = new Date(raffle.launch_time).getTime();
      const diff = launch - now;

      if (diff <= 0) return 'Ready to Launch';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `Launches in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    
    // For active raffles, show time to draw
    if (!raffle.draw_date) return 'Draw Date TBA';
    
    const now = new Date().getTime();
    const draw = new Date(raffle.draw_date).getTime();
    const diff = draw - now;

    if (diff <= 0) return 'Draw Complete';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const handleBuyTicket = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setIsPurchaseModalOpen(true);
  };

  const getStatusBadge = (status: string, drawDate: string | null, ticketsSold: number, launchTime: string | null, winnerAddress: string | null) => {
    // Check if raffle has a future launch time
    if (launchTime && new Date(launchTime) > new Date()) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📅 UPCOMING</Badge>;
    }
    if (status === 'draft') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📅 UPCOMING</Badge>;
    }
    // Check if there's a winner - this means it's completed regardless of status
    if (winnerAddress) {
      return <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30">✓ COMPLETED</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30">✓ COMPLETED</Badge>;
    }
    if (status === 'drawing') {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">🎲 DRAWING WINNER...</Badge>;
    }
    if (status === 'refunding') {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">💸 REFUNDING</Badge>;
    }
    // Check if draw date has passed for active raffles
    if (drawDate && new Date(drawDate) < new Date() && status === 'active') {
      return <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30">✓ COMPLETED</Badge>;
    }
    if (ticketsSold === 0 && drawDate && new Date(drawDate) > new Date()) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ PENDING</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 LIVE</Badge>;
  };

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
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-orbitron font-bold mb-4">
            <span className="gradient-text">
              {filterView === 'all' ? 'All Raffles' : filterView === 'upcoming' ? 'Upcoming Raffles' : 'Live Raffles'}
            </span>
          </h1>
          <p className="text-muted-foreground font-rajdhani text-lg max-w-2xl mx-auto">
            {filterView === 'all'
              ? 'Browse all raffles - active, upcoming, and completed. Enter for a chance to win amazing prizes!'
              : filterView === 'upcoming' 
              ? 'Preview upcoming raffles that will be available soon!'
              : 'Browse active and completed raffles. Enter for a chance to win amazing prizes!'
            }
          </p>
          
          <div className="mt-6 flex justify-center gap-3">
            <Button 
              variant={filterView === 'all' ? "default" : "outline"}
              onClick={() => setFilterView('all')}
              className="font-rajdhani"
            >
              All Raffles
            </Button>
            <Button 
              variant={filterView === 'live' ? "default" : "outline"}
              onClick={() => setFilterView('live')}
              className="font-rajdhani"
            >
              Live Raffles
            </Button>
            <Button 
              variant={filterView === 'upcoming' ? "default" : "outline"}
              onClick={() => setFilterView('upcoming')}
              className="font-rajdhani"
            >
              Upcoming Raffles
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaffles.map((raffle) => {
            const progress = (raffle.tickets_sold / raffle.max_tickets) * 100;
            const isActive = raffle.status === 'active';
            // Consider a raffle completed if it has status 'completed' OR has a winner
            const isCompleted = raffle.status === 'completed' || !!raffle.winner_address;

            return (
              <Card key={raffle.id} className="glass-card border-neon-cyan/30 overflow-hidden group hover:border-neon-cyan/60 transition-all">
                <Link to={`/raffle/${raffle.id}`} className="block relative h-48 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                  {raffle.image_url ? (
                    <img src={raffle.image_url} alt={raffle.name} className="w-full h-full object-cover" />
                  ) : (
                    <Ticket className="w-20 h-20 text-neon-cyan/40" />
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(raffle.status, raffle.draw_date, raffle.tickets_sold, raffle.launch_time, raffle.winner_address)}
                  </div>
                </Link>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-orbitron font-bold text-neon-cyan mb-2">
                      {raffle.name}
                    </h3>
                    <p className="text-2xl font-bold text-neon-gold mb-1">
                      {raffle.prize_description}
                    </p>
                    <p className="text-sm text-muted-foreground font-rajdhani">
                      {raffle.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-rajdhani">
                      <span className="text-muted-foreground">
                        Ticket: ${raffle.ticket_price} • {raffle.tickets_sold.toLocaleString()} / {raffle.max_tickets.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {isCompleted && raffle.winner_address ? (
                    <div className="pt-2 border-t border-neon-cyan/20">
                      <div className="bg-gradient-to-r from-neon-gold/20 to-neon-cyan/20 border border-neon-gold/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-neon-gold" />
                          <span className="text-sm font-bold text-neon-gold">Winner Announced!</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded flex-1 truncate">
                            {raffle.winner_address}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-7 w-7 p-0"
                          >
                            <a
                              href={getBlockExplorerUrl(chainId, 'address', raffle.winner_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                        {account?.toLowerCase() === raffle.winner_address.toLowerCase() && (
                          <div className="mt-2 p-2 bg-neon-gold/10 border border-neon-gold/30 rounded text-center">
                            <p className="text-xs font-bold text-neon-gold">🎉 You Won! 🎉</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : raffle.status === 'drawing' ? (
                    <div className="pt-2 border-t border-neon-cyan/20">
                      <div className="flex items-center justify-center gap-2 text-sm text-neon-cyan py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-rajdhani">Drawing Winner...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-neon-cyan/20 space-y-3">
                      <div className="text-center text-sm font-rajdhani text-neon-cyan">
                        {getTimeRemaining(raffle)}
                      </div>
                      <Button
                        onClick={() => handleBuyTicket(raffle)}
                        disabled={!isActive}
                        className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 transition-opacity font-orbitron"
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        {raffle.tickets_sold === 0 && !raffle.draw_date ? 'Coming Soon' : 'Buy Ticket'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {selectedRaffle && (
        <PurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setSelectedRaffle(null);
          }}
          raffle={{
            id: selectedRaffle.id,
            name: selectedRaffle.name,
            ticketPrice: selectedRaffle.ticket_price,
            maxTickets: selectedRaffle.max_tickets,
            ticketsSold: selectedRaffle.tickets_sold,
            contract_raffle_id: selectedRaffle.contract_raffle_id,
            network: selectedRaffle.network,
          }}
          account={account}
          onPurchaseSuccess={fetchRaffles}
        />
      )}
    </div>
  );
}
