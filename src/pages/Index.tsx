import { useState, useEffect } from 'react';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RaffleCard } from '@/components/RaffleCard';
import { useWeb3 } from '@/hooks/useWeb3';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Mock data for raffles
const mockRaffles = [
  {
    id: 1,
    title: 'Rolex Submariner',
    description: 'Luxury timepiece with provable authenticity',
    prize: '$15,000 Value',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80',
    ticketPrice: '75 USDT',
    ticketPriceNumeric: 75,
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
    ticketPrice: '750 USDT',
    ticketPriceNumeric: 750,
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
    ticketPrice: '150 USDT',
    ticketPriceNumeric: 150,
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
    ticketPrice: '30 USDT',
    ticketPriceNumeric: 30,
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
    ticketPrice: '120 USDT',
    ticketPriceNumeric: 120,
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
    ticketPrice: '60 USDT',
    ticketPriceNumeric: 60,
    totalTickets: 180,
    soldTickets: 124,
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

const Index = () => {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const [activeRaffles, setActiveRaffles] = useState<any[]>([]);
  const [upcomingRaffles, setUpcomingRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuresContent, setFeaturesContent] = useState<any>({});

  useEffect(() => {
    fetchRaffles();
    fetchFeaturesContent();
  }, []);

  const fetchRaffles = async () => {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('show_on_home', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      // Separate active and draft raffles
      const active = data.filter(raffle => raffle.status === 'active');
      const upcoming = data.filter(raffle => raffle.status === 'draft');
      setActiveRaffles(active);
      setUpcomingRaffles(upcoming);
    }
    setLoading(false);
  };

  const fetchFeaturesContent = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('page', 'home')
      .in('content_key', [
        'features_section_title',
        'feature_1_icon', 'feature_1_title', 'feature_1_description',
        'feature_2_icon', 'feature_2_title', 'feature_2_description',
        'feature_3_icon', 'feature_3_title', 'feature_3_description',
        'feature_4_icon', 'feature_4_title', 'feature_4_description',
        'feature_5_icon', 'feature_5_title', 'feature_5_description',
        'feature_6_icon', 'feature_6_title', 'feature_6_description'
      ]);

    if (!error && data) {
      const contentMap = data.reduce((acc, item) => {
        acc[item.content_key] = item.content_value;
        return acc;
      }, {} as Record<string, string>);
      setFeaturesContent(contentMap);
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Navbar
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />

      {/* Hero Section */}
      <Hero />

      {/* Active Raffles Section */}
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

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : activeRaffles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No active raffles at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeRaffles.map((raffle) => (
                <RaffleCard 
                  key={raffle.id} 
                  id={raffle.id}
                  title={raffle.name}
                  description={raffle.description || raffle.prize_description}
                  prize={raffle.prize_description}
                  image={raffle.image_url || mockRaffles[0].image}
                  ticketPrice={`${raffle.ticket_price} USDT`}
                  ticketPriceNumeric={raffle.ticket_price}
                  totalTickets={raffle.max_tickets}
                  soldTickets={raffle.tickets_sold || 0}
                  endDate={raffle.draw_date ? new Date(raffle.draw_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                  isActive={raffle.status === 'active'}
                  account={account} 
                  status={raffle.status}
                  winnerAddress={raffle.winner_address}
                  contract_raffle_id={raffle.contract_raffle_id}
                  launchTime={raffle.launch_time ? new Date(raffle.launch_time) : null}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Raffles Section */}
      {upcomingRaffles.length > 0 && (
        <section className="py-20 px-4 bg-background/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-orbitron font-bold text-glow mb-4">
                Upcoming Raffles
              </h2>
              <p className="text-muted-foreground text-lg">
                Coming soon - get ready for these exciting prizes!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingRaffles.map((raffle) => (
                <RaffleCard 
                  key={raffle.id} 
                  id={raffle.id}
                  title={raffle.name}
                  description={raffle.description || raffle.prize_description}
                  prize={raffle.prize_description}
                  image={raffle.image_url || mockRaffles[0].image}
                  ticketPrice={`${raffle.ticket_price} USDT`}
                  ticketPriceNumeric={raffle.ticket_price}
                  totalTickets={raffle.max_tickets}
                  soldTickets={raffle.tickets_sold || 0}
                  endDate={raffle.draw_date ? new Date(raffle.draw_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                  isActive={false}
                  account={account} 
                  status={raffle.status}
                  winnerAddress={raffle.winner_address}
                  contract_raffle_id={raffle.contract_raffle_id}
                  launchTime={raffle.launch_time ? new Date(raffle.launch_time) : null}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Raffler */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-effect p-8 rounded-xl">
            <h2 className="text-4xl sm:text-5xl font-orbitron font-bold text-center text-accent mb-12">
              {featuresContent.features_section_title || '⚡ Why Choose Raffler?'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div
                  key={num}
                  className="p-6 bg-background/30 rounded-xl border border-border/50 hover:scale-105 transition-transform"
                >
                  <div className="text-5xl mb-4">
                    {featuresContent[`feature_${num}_icon`] || ''}
                  </div>
                  <h3 className="font-orbitron text-xl text-primary mb-3">
                    {featuresContent[`feature_${num}_title`] || ''}
                  </h3>
                  <p className="text-muted-foreground">
                    {featuresContent[`feature_${num}_description`] || ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <h3 className="font-orbitron text-lg font-semibold mb-3">Raffler</h3>
              <p className="text-muted-foreground text-sm">
                Transparent blockchain raffles powered by Ethereum & Chainlink VRF.
              </p>
              <p className="text-muted-foreground text-sm mt-3">
                Credit to Geridos
              </p>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-orbitron text-lg font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">
                    Disclaimer
                  </a>
                </li>
              </ul>
            </div>

            {/* Important Notice */}
            <div>
              <h3 className="font-orbitron text-lg font-semibold mb-3">Important</h3>
              <p className="text-muted-foreground text-sm">
                Always gamble responsibly. Must be 18+ to participate. Blockchain transactions are irreversible.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 text-center">
            <p className="text-muted-foreground text-sm font-rajdhani">
              © {new Date().getFullYear()} Raffler. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
