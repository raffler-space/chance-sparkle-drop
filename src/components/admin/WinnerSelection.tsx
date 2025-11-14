import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2, Sparkles, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { useWeb3 } from '@/hooks/useWeb3';
import { ethers } from 'ethers';

interface Raffle {
  id: number;
  name: string;
  prize_description: string;
  max_tickets: number;
  tickets_sold: number;
  status: string;
  winner_address: string | null;
  draw_tx_hash: string | null;
  contract_raffle_id?: number | null;
  draw_date: string | null;
}

export const WinnerSelection = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const { account, chainId } = useWeb3();
  const { contract, selectWinner, isContractReady } = useRaffleContract(chainId, account);

  useEffect(() => {
    fetchRaffles();
  }, []);

  // Listen for WinnerSelected events
  useEffect(() => {
    if (!contract) return;

    const handleWinnerSelected = async (
      raffleId: ethers.BigNumber,
      winner: string,
      winningEntry: ethers.BigNumber,
      event: any
    ) => {
      console.log('WinnerSelected event:', { raffleId: raffleId.toString(), winner, winningEntry: winningEntry.toString() });
      
      const txHash = event.transactionHash;
      const contractRaffleId = raffleId.toNumber();

      // Find the database raffle by contract_raffle_id
      const raffleQuery = await (supabase as any)
        .from('raffles')
        .select('id')
        .eq('contract_raffle_id', contractRaffleId)
        .single();

      if (raffleQuery.error || !raffleQuery.data) {
        console.error('Error finding raffle in database:', raffleQuery.error);
        toast.error('Failed to find raffle record');
        return;
      }

      // Update database with winner info
      const { error } = await supabase
        .from('raffles')
        .update({
          status: 'completed',
          winner_address: winner,
          draw_tx_hash: txHash,
          completed_at: new Date().toISOString(),
        })
        .eq('id', raffleQuery.data.id);

      if (error) {
        console.error('Error updating winner in database:', error);
        toast.error('Failed to update winner information');
      } else {
        toast.success(`Winner selected: ${winner.slice(0, 6)}...${winner.slice(-4)}`);
        fetchRaffles();
        setProcessing(null);
      }
    };

    contract.on('WinnerSelected', handleWinnerSelected);

    return () => {
      contract.off('WinnerSelected', handleWinnerSelected);
    };
  }, [contract]);

  const fetchRaffles = async () => {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .in('status', ['active', 'drawing', 'completed'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRaffles(data);
    }
    setLoading(false);
  };

  const handleTriggerDraw = async (raffleId: number, contractRaffleId: number | null) => {
    if (!isContractReady) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!contractRaffleId) {
      toast.error('This raffle was not created on the blockchain. Please create a new raffle.');
      return;
    }

    setProcessing(raffleId);

    try {
      // Update raffle status to drawing in database
      const { error: updateError } = await supabase
        .from('raffles')
        .update({ status: 'drawing' })
        .eq('id', raffleId);

      if (updateError) {
        toast.error('Failed to initiate draw');
        setProcessing(null);
        return;
      }

      // Call smart contract to select winner using contract raffle ID
      toast.loading('Requesting Chainlink VRF...', { id: 'vrf-request' });
      const success = await selectWinner(contractRaffleId);

      if (success) {
        toast.success('VRF request sent! Winner will be selected shortly...', { id: 'vrf-request' });
        // Note: The actual winner update happens in the event listener
      } else {
        // Revert status if failed
        await supabase
          .from('raffles')
          .update({ status: 'active' })
          .eq('id', raffleId);
        setProcessing(null);
      }
    } catch (error) {
      console.error('Error triggering draw:', error);
      toast.error('Failed to trigger draw');
      setProcessing(null);
      fetchRaffles();
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-neon-gold/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-neon-gold" />
          <div>
            <h3 className="font-orbitron font-bold text-lg">Chainlink VRF Integration</h3>
            <p className="text-sm text-muted-foreground">
              Trigger verifiable random winner selection using Chainlink VRF
            </p>
          </div>
        </div>
        
        <div className="bg-background/50 rounded-lg p-4 space-y-2 text-sm">
          <p className="text-muted-foreground">
            <strong>Note:</strong> Winner selection uses Chainlink VRF for provably fair randomness.
          </p>
          <p className="text-muted-foreground">
            The process involves:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
            <li>Request random number from Chainlink VRF</li>
            <li>Wait for VRF callback with random number</li>
            <li>Select winner from NFT holders who purchased tickets</li>
            <li>Record winner on-chain and update database</li>
          </ol>
        </div>
      </Card>

      <div className="grid gap-4">
        {raffles.map((raffle) => {
          const progress = (raffle.tickets_sold / raffle.max_tickets) * 100;
          const now = new Date();
          const drawDate = raffle.draw_date ? new Date(raffle.draw_date) : null;
          const hasEnded = drawDate ? now >= drawDate : false;
          const canDraw = raffle.status === 'active' && raffle.tickets_sold > 0 && hasEnded;
          
          return (
            <Card key={raffle.id} className="glass-card border-neon-gold/30 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-neon-gold" />
                    <h3 className="font-orbitron font-bold text-xl">{raffle.name}</h3>
                    <Badge 
                      variant={
                        raffle.status === 'completed' ? 'default' :
                        raffle.status === 'drawing' ? 'secondary' :
                        'outline'
                      }
                    >
                      {raffle.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Prize</p>
                      <p className="font-rajdhani font-bold text-neon-gold">{raffle.prize_description}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tickets Sold</span>
                        <span className="font-rajdhani">{raffle.tickets_sold} / {raffle.max_tickets}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {raffle.winner_address && (
                      <div className="bg-gradient-to-r from-neon-gold/20 to-neon-cyan/20 border border-neon-gold/30 rounded-lg p-4 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="w-5 h-5 text-neon-gold" />
                          <span className="font-bold text-neon-gold">Winner Selected!</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Winner Address:</span>
                            <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded flex-1 truncate">
                              {raffle.winner_address}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyAddress(raffle.winner_address!)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-8 w-8 p-0"
                            >
                              <a
                                href={`https://sepolia.etherscan.io/address/${raffle.winner_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          </div>
                          {raffle.draw_tx_hash && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Transaction:</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-8 px-2 text-xs"
                              >
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${raffle.draw_tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View on Etherscan <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() => handleTriggerDraw(raffle.id, raffle.contract_raffle_id)}
                    disabled={!canDraw || processing === raffle.id || raffle.status === 'drawing' || raffle.status === 'completed' || !raffle.contract_raffle_id}
                    className="bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90"
                  >
                    {processing === raffle.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : raffle.status === 'drawing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Waiting for VRF...
                      </>
                    ) : raffle.status === 'completed' ? (
                      'Draw Complete'
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        Trigger Winner Draw
                      </>
                    )}
                  </Button>
                  
                  {!canDraw && raffle.status === 'active' && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {raffle.tickets_sold === 0 
                        ? 'Waiting for at least 1 ticket to be sold'
                        : !hasEnded && drawDate
                        ? `Draw available on ${drawDate.toLocaleString()}`
                        : 'Draw not available'}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
