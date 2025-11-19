import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useWeb3 } from '@/hooks/useWeb3';
import { Loader2 } from 'lucide-react';
import { PurchaseModal } from '@/components/PurchaseModal';
import { RaffleCard } from '@/components/RaffleCard';
import { useRaffleData } from '@/hooks/useRaffleData';
import { Button } from '@/components/ui/button';

export default function Raffles() {
  const { account, isConnecting, connectWallet, disconnectWallet, chainId } = useWeb3();
  const { raffles, loading, refetch } = useRaffleData(chainId, account || undefined);
  const [selectedRaffle, setSelectedRaffle] = useState<any | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'live' | 'upcoming'>('all');

  // Update time every second for countdown timers in child components
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render for countdown timers
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter raffles based on selected view
  const filteredRaffles = filterView === 'all'
    ? raffles.filter(r => r.status !== 'draft')
    : filterView === 'upcoming'
    ? raffles.filter(r => r.launch_time && new Date(r.launch_time) > new Date())
    : raffles.filter(r => r.is_active || r.has_ended);

  return (
    <div className="min-h-screen bg-background">
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

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : filteredRaffles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              {filterView === 'upcoming' ? 'No upcoming raffles at the moment.' : 'No raffles available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaffles.map((raffle) => (
              <RaffleCard
                key={raffle.id}
                id={raffle.id}
                title={raffle.name}
                description={raffle.description}
                prize={raffle.prize_description}
                image={raffle.image_url || ''}
                ticketPrice={`${raffle.ticket_price} USDT`}
                ticketPriceNumeric={raffle.ticket_price}
                totalTickets={raffle.max_tickets}
                soldTickets={raffle.tickets_sold}
                endDate={raffle.draw_date ? new Date(raffle.draw_date) : new Date()}
                isActive={raffle.is_active}
                account={account}
                onPurchaseSuccess={refetch}
                status={raffle.status}
                winnerAddress={raffle.winner_address}
                contract_raffle_id={raffle.contract_raffle_id}
                launchTime={raffle.launch_time ? new Date(raffle.launch_time) : null}
              />
            ))}
          </div>
        )}
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
          }}
          account={account}
          onPurchaseSuccess={() => {
            refetch();
            setIsPurchaseModalOpen(false);
            setSelectedRaffle(null);
          }}
        />
      )}
    </div>
  );
}
