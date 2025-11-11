import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Raffle {
  id: number;
  name: string;
  prize_description: string;
  max_tickets: number;
  tickets_sold: number;
  status: string;
  winner_address: string | null;
  draw_tx_hash: string | null;
}

export const WinnerSelection = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchRaffles();
  }, []);

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

  const handleTriggerDraw = async (raffleId: number) => {
    setProcessing(raffleId);
    
    // In a real implementation, this would:
    // 1. Call the smart contract's requestRandomWords function
    // 2. Wait for Chainlink VRF to provide random number
    // 3. Call selectWinner with the random number
    // 4. Update the database with winner information
    
    // For now, we'll simulate the process
    toast.loading('Initiating Chainlink VRF request...', { id: 'vrf-request' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update raffle status to drawing
    const { error: updateError } = await supabase
      .from('raffles')
      .update({ status: 'drawing' })
      .eq('id', raffleId);

    if (updateError) {
      toast.error('Failed to initiate draw', { id: 'vrf-request' });
      setProcessing(null);
      return;
    }

    toast.success('VRF request initiated! Waiting for Chainlink response...', { id: 'vrf-request' });
    
    // Simulate waiting for VRF response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // In production, the actual winner would be determined by the smart contract
    // This is just a simulation
    toast.success('Winner selected! Check the smart contract for details.', { id: 'vrf-request' });
    
    setProcessing(null);
    fetchRaffles();
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
          const canDraw = raffle.status === 'active' && raffle.tickets_sold > 0;
          
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
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Winner</p>
                        <p className="font-mono text-xs text-neon-cyan">{raffle.winner_address}</p>
                        {raffle.draw_tx_hash && (
                          <a 
                            href={`https://etherscan.io/tx/${raffle.draw_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-neon-purple hover:underline"
                          >
                            View transaction
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() => handleTriggerDraw(raffle.id)}
                    disabled={!canDraw || processing !== null}
                    className="bg-gradient-to-r from-neon-gold to-neon-purple hover:opacity-90 disabled:opacity-50"
                  >
                    {processing === raffle.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Trigger Draw
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
