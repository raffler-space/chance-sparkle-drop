import { useState } from 'react';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RaffleCard } from '@/components/RaffleCard';
import { useWeb3 } from '@/hooks/useWeb3';
import { toast } from 'sonner';

// Mock data for raffles
const mockRaffles = [
  {
    id: 1,
    title: 'Rolex Submariner',
    description: 'Luxury timepiece with provable authenticity',
    prize: '$15,000 Value',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80',
    ticketPrice: '0.05 ETH',
    totalTickets: 100,
    soldTickets: 67,
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: 2,
    title: 'Lamborghini Huracán',
    description: 'Supercar raffle - win your dream vehicle',
    prize: '$250,000 Value',
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
    ticketPrice: '0.5 ETH',
    totalTickets: 500,
    soldTickets: 423,
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: 3,
    title: 'Rare NFT Collection',
    description: 'Exclusive NFT bundle from top artists',
    prize: '$50,000 Value',
    image: 'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=800&q=80',
    ticketPrice: '0.1 ETH',
    totalTickets: 200,
    soldTickets: 156,
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: 4,
    title: 'Gaming PC Ultimate',
    description: 'Top-tier gaming setup with RTX 4090',
    prize: '$8,000 Value',
    image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&q=80',
    ticketPrice: '0.02 ETH',
    totalTickets: 150,
    soldTickets: 89,
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: 5,
    title: 'Bitcoin Package',
    description: '0.5 BTC prize for one lucky winner',
    prize: '0.5 BTC',
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80',
    ticketPrice: '0.08 ETH',
    totalTickets: 250,
    soldTickets: 198,
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: 6,
    title: 'Luxury Vacation',
    description: 'All-expenses paid trip to the Maldives',
    prize: '$20,000 Value',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80',
    ticketPrice: '0.04 ETH',
    totalTickets: 180,
    soldTickets: 124,
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

const Index = () => {
  const { account, isConnecting, connectWallet } = useWeb3();
  const [selectedRaffle, setSelectedRaffle] = useState<number | null>(null);

  const handleEnterRaffle = (raffleId: number) => {
    if (!account) {
      toast.error('Please connect your wallet first');
      connectWallet();
      return;
    }
    setSelectedRaffle(raffleId);
    toast.info('Opening entry modal...');
    // TODO: Open entry modal
  };

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Navbar
        onConnectWallet={connectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />

      {/* Hero Section */}
      <Hero />

      {/* Raffles Section */}
      <section id="raffles" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-orbitron font-bold text-glow mb-4">
              Active Raffles
            </h2>
            <p className="text-muted-foreground text-lg">
              Enter now for a chance to win exclusive prizes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockRaffles.map((raffle) => (
              <RaffleCard key={raffle.id} {...raffle} onEnter={handleEnterRaffle} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 glass-effect border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-orbitron font-bold text-glow mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="font-orbitron font-bold text-xl">Connect Wallet</h3>
              <p className="text-muted-foreground">
                Link your MetaMask or compatible Web3 wallet
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto text-2xl font-bold text-secondary">
                2
              </div>
              <h3 className="font-orbitron font-bold text-xl">Choose Raffle</h3>
              <p className="text-muted-foreground">
                Browse active raffles and select your favorite prize
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto text-2xl font-bold text-accent">
                3
              </div>
              <h3 className="font-orbitron font-bold text-xl">Buy Entries</h3>
              <p className="text-muted-foreground">
                Purchase raffle tickets with ETH - more entries = better odds
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple/20 flex items-center justify-center mx-auto text-2xl font-bold text-purple">
                4
              </div>
              <h3 className="font-orbitron font-bold text-xl">Win Big</h3>
              <p className="text-muted-foreground">
                Winners selected via Chainlink VRF for provable fairness
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p className="font-rajdhani">
            © 2024 Raffler. Powered by Ethereum & Chainlink VRF.
          </p>
          <p className="text-sm mt-2">Always gamble responsibly. Must be 18+ to participate.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
