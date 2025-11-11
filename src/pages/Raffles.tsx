import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/hooks/useWeb3';
import { Loader2, Ticket, Trophy } from 'lucide-react';
import { PurchaseModal } from '@/components/PurchaseModal';

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
}

export default function Raffles() {
  const navigate = useNavigate();
  const { account, isConnecting, connectWallet } = useWeb3();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    fetchRaffles();
  }, []);

  const fetchRaffles = async () => {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching raffles:', error);
    } else {
      setRaffles(data || []);
    }
    setLoading(false);
  };

  const getTimeRemaining = (drawDate: string | null) => {
    if (!drawDate) return 'Launching Soon';
    
    const now = new Date().getTime();
    const draw = new Date(drawDate).getTime();
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

  const getStatusBadge = (status: string, drawDate: string | null, ticketsSold: number) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ COMPLETED</Badge>;
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
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <main className="relative z-10 container mx-auto px-4 py-8 mt-20">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-orbitron font-bold mb-4">
            <span className="gradient-text">All Raffles</span>
          </h1>
          <p className="text-muted-foreground font-rajdhani text-lg max-w-2xl mx-auto">
            Browse all active and completed raffles. Enter for a chance to win amazing prizes!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.map((raffle) => {
            const progress = (raffle.tickets_sold / raffle.max_tickets) * 100;
            const isActive = raffle.status === 'active';
            const isCompleted = raffle.status === 'completed';

            return (
              <Card key={raffle.id} className="glass-card border-neon-cyan/30 overflow-hidden group hover:border-neon-cyan/60 transition-all">
                <div className="relative h-48 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center overflow-hidden">
                  {raffle.image_url ? (
                    <img src={raffle.image_url} alt={raffle.name} className="w-full h-full object-cover" />
                  ) : (
                    <Ticket className="w-20 h-20 text-neon-cyan/40" />
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(raffle.status, raffle.draw_date, raffle.tickets_sold)}
                  </div>
                </div>

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
                      <div className="flex items-center gap-2 text-sm text-neon-gold">
                        <Trophy className="w-4 h-4" />
                        <span className="font-rajdhani">Winner: {raffle.winner_address}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-neon-cyan/20 space-y-3">
                      <div className="text-center text-sm font-rajdhani text-neon-cyan">
                        {getTimeRemaining(raffle.draw_date)}
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
          }}
          account={account}
        />
      )}
    </div>
  );
}
