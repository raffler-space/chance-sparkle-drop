import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Ticket, Trophy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { PurchaseModal } from './PurchaseModal';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { useWeb3 } from '@/hooks/useWeb3';
import { getBlockExplorerUrl } from '@/utils/blockExplorer';
import { useNavigate, Link } from 'react-router-dom';

interface RaffleCardProps {
  id: number;
  title: string;
  description: string;
  prize: string;
  image: string;
  ticketPrice: string;
  ticketPriceNumeric: number;
  totalTickets: number;
  soldTickets: number;
  endDate: Date;
  isActive: boolean;
  account: string | null;
  onPurchaseSuccess?: () => void;
  status?: string;
  winnerAddress?: string | null;
  contract_raffle_id?: number | null;
  launchTime?: Date | null;
  network: string;
}

export const RaffleCard = ({
  id,
  title,
  description,
  prize,
  image,
  ticketPrice,
  ticketPriceNumeric,
  totalTickets,
  soldTickets,
  endDate,
  isActive,
  account,
  onPurchaseSuccess,
  status,
  winnerAddress,
  contract_raffle_id,
  launchTime,
  network,
}: RaffleCardProps) => {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [blockchainTicketsSold, setBlockchainTicketsSold] = useState<number | null>(null);
  const { chainId } = useWeb3();
  const { getRaffleInfo, isContractReady } = useRaffleContract(chainId, account);
  const navigate = useNavigate();

  // Fetch actual ticket count from blockchain and refresh periodically
  useEffect(() => {
    const fetchBlockchainData = async () => {
      if (!isContractReady || contract_raffle_id === null || contract_raffle_id === undefined) {
        return;
      }

      const info = await getRaffleInfo(contract_raffle_id);
      if (info) {
        setBlockchainTicketsSold(info.ticketsSold);
      }
    };

    fetchBlockchainData();
    
    // Refresh every 10 seconds to catch updates
    const interval = setInterval(fetchBlockchainData, 10000);
    return () => clearInterval(interval);
  }, [isContractReady, contract_raffle_id, getRaffleInfo]);

  const timeRemaining = () => {
    const now = new Date();
    // If launchTime is provided and in the future, count down to launch
    const targetDate = launchTime && launchTime.getTime() > now.getTime() ? launchTime : endDate;
    const diff = targetDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  // Determine if we should show "Starting In" or "Ends In"
  const isUpcoming = launchTime && launchTime.getTime() > new Date().getTime();

  // Use blockchain data if available, fallback to database
  const actualSoldTickets = blockchainTicketsSold !== null ? blockchainTicketsSold : soldTickets;
  const progressPercentage = (actualSoldTickets / totalTickets) * 100;

  return (
    <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden group">
      {/* Image */}
      <Link to={`/raffle/${id}`} className="block relative h-64 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <Badge
          className={`absolute top-4 right-4 ${
            status === 'completed'
              ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30'
              : status === 'drawing'
              ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30'
              : status === 'refunding'
              ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              : isUpcoming
              ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30'
              : isActive
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-neon-gold/20 text-neon-gold border-neon-gold/30'
          }`}
        >
          {status === 'completed' ? '✓ Completed' : status === 'drawing' ? 'Drawing' : status === 'refunding' ? '💸 Refunding' : isUpcoming ? '📅 Upcoming' : isActive ? '🔴 LIVE' : '✓ Completed'}
        </Badge>
      </Link>

      <CardHeader>
        <h3 className="text-2xl font-orbitron font-bold text-glow">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <div className="pt-2">
          <p className="text-accent font-bold text-xl">{prize}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Price</div>
            <div className="font-bold text-primary">{ticketPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Sold</div>
            <div className="font-bold flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              {actualSoldTickets}/{totalTickets}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{isUpcoming ? 'Starting In' : 'Ends In'}</div>
            <div className="font-bold flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              {timeRemaining()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Winner Display */}
        {winnerAddress && (
          <div className="bg-gradient-to-r from-neon-gold/20 to-neon-cyan/20 border border-neon-gold/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-neon-gold" />
              <span className="font-bold text-neon-gold">Winner Announced!</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded flex-1 truncate">
                {winnerAddress}
              </code>
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-7 w-7 p-0"
              >
                <a
                  href={getBlockExplorerUrl(chainId, 'address', winnerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
            {account?.toLowerCase() === winnerAddress.toLowerCase() && (
              <div className="mt-3 p-2 bg-neon-gold/10 border border-neon-gold/30 rounded text-center">
                <p className="text-sm font-bold text-neon-gold">🎉 Congratulations! You Won! 🎉</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/raffle/${id}`)}
          className="flex-1"
        >
          View Details
        </Button>
        <Button
          onClick={() => setIsPurchaseModalOpen(true)}
          disabled={!isActive || status === 'drawing' || status === 'completed'}
          className="flex-1 bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
        >
          <Ticket className="mr-2 h-4 w-4" />
          {status === 'completed' ? 'Ended' : status === 'drawing' ? 'Drawing...' : 'Enter'}
        </Button>
      </CardFooter>

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        raffle={{
          id,
          name: title,
          ticketPrice: ticketPriceNumeric,
          maxTickets: totalTickets,
          ticketsSold: soldTickets,
          contract_raffle_id,
          network,
        }}
        account={account}
        onPurchaseSuccess={onPurchaseSuccess}
      />
    </Card>
  );
};
