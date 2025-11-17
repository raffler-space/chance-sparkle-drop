import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, ExternalLink } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { toast } from 'sonner';
import { getBlockExplorerUrl } from '@/utils/blockExplorer';

interface WonRaffle {
  id: number;
  name: string;
  prize_description: string;
  winner_address: string;
  draw_tx_hash: string | null;
  contract_raffle_id: number;
}

export const WinnerNotification = ({ userId }: { userId: string }) => {
  const [wonRaffles, setWonRaffles] = useState<WonRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const { account, chainId } = useWeb3();
  const { claimPrize } = useRaffleContract(chainId, account);

  useEffect(() => {
    const fetchWonRaffles = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      // Fetch raffles where user's wallet address is the winner
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('winner_address', account.toLowerCase())
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (!error && data) {
        setWonRaffles(data);
      }
      
      setLoading(false);
    };

    fetchWonRaffles();
  }, [account, userId]);

  const handleClaimPrize = async (contractRaffleId: number, raffleName: string) => {
    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }

    const success = await claimPrize(contractRaffleId);
    if (success) {
      toast.success(`Prize claimed for ${raffleName}!`);
      // Refresh won raffles
      const { data } = await supabase
        .from('raffles')
        .select('*')
        .eq('winner_address', account.toLowerCase())
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      if (data) setWonRaffles(data);
    }
  };

  if (loading || wonRaffles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {wonRaffles.map((raffle) => (
        <Card 
          key={raffle.id} 
          className="glass-card border-neon-gold/50 bg-gradient-to-r from-neon-gold/10 to-neon-cyan/10 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-neon-gold to-neon-cyan p-3 rounded-full">
              <Trophy className="w-8 h-8 text-background" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-neon-gold" />
                <h3 className="font-orbitron font-bold text-xl text-neon-gold">
                  Congratulations! You Won!
                </h3>
              </div>
              
              <div className="space-y-2">
                <p className="font-rajdhani text-lg">
                  <span className="text-muted-foreground">Raffle:</span>{' '}
                  <span className="font-bold">{raffle.name}</span>
                </p>
                <p className="font-rajdhani text-lg">
                  <span className="text-muted-foreground">Prize:</span>{' '}
                  <span className="font-bold text-neon-cyan">{raffle.prize_description}</span>
                </p>
                
                {raffle.draw_tx_hash && (
                  <a
                    href={getBlockExplorerUrl(chainId, 'tx', raffle.draw_tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-neon-cyan hover:text-neon-gold transition-colors"
                  >
                    View draw transaction <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <Button
              onClick={() => handleClaimPrize(raffle.contract_raffle_id, raffle.name)}
              className="bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90 font-orbitron"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Claim Prize
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
