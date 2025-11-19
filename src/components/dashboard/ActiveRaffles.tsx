import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Trophy, Loader2, Calendar, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClaimRewardForm } from './ClaimRewardForm';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleData } from '@/hooks/useRaffleData';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { supabase } from '@/integrations/supabase/client';

export const ActiveRaffles = ({ userId }: { userId: string }) => {
  const [participatingRaffleIds, setParticipatingRaffleIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<any | null>(null);
  const { account, chainId } = useWeb3();
  const { raffles: allRaffles, loading: rafflesLoading } = useRaffleData(chainId, account || undefined);
  const { getUserEntries } = useRaffleContract(chainId, account || undefined);

  useEffect(() => {
    fetchParticipatingRaffles();
  }, [userId, account, allRaffles]);

  const fetchParticipatingRaffles = async () => {
    setLoading(true);
    
    // Get participating raffle IDs from tickets table
    if (userId) {
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('raffle_id')
        .eq('user_id', userId);

      if (ticketsData && ticketsData.length > 0) {
        const raffleIds = ticketsData.map(t => t.raffle_id);
        setParticipatingRaffleIds(new Set(raffleIds));
      }
    }

    // Alternatively check blockchain for participation if wallet connected
    if (account && allRaffles.length > 0) {
      const blockchainParticipating = new Set<number>();
      
      for (const raffle of allRaffles) {
        if (raffle.contract_raffle_id !== null && raffle.contract_raffle_id !== undefined) {
          try {
            const userTickets = await getUserEntries(raffle.contract_raffle_id, account);
            if (userTickets.length > 0) {
              blockchainParticipating.add(raffle.id);
            }
          } catch (error) {
            console.error(`Error checking participation for raffle ${raffle.id}:`, error);
          }
        }
      }
      
      setParticipatingRaffleIds(prev => new Set([...prev, ...blockchainParticipating]));
    }

    setLoading(false);
  };

  const handleClaim = (raffle: any) => {
    setSelectedRaffle(raffle);
    setClaimFormOpen(true);
  };

  const isWinner = (raffle: any) => {
    return raffle.status === 'completed' && 
           raffle.winner_address && 
           account && 
           raffle.winner_address.toLowerCase() === account.toLowerCase();
  };

  const participatingRaffles = allRaffles.filter(raffle => 
    participatingRaffleIds.has(raffle.id)
  );
                participating.push({
                  ...raffle,
                  tickets_sold: blockchainData?.ticketsSold ?? raffle.tickets_sold,
                });
                participatingIds.add(raffle.id);
              }
            }
          }

          setRaffles(participating);
          setParticipatingRaffleIds(participatingIds);
        }
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
      }
    }
    
    setLoading(false);
  };

  const handleClaim = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setClaimFormOpen(true);
  };

  const isWinner = (raffle: Raffle) => {
    return raffle.status === 'completed' && 
           raffle.winner_address?.toLowerCase() === account?.toLowerCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  const participatingRaffles = raffles.filter(r => participatingRaffleIds.has(r.id));

  if (participatingRaffles.length === 0) {
    return (
      <Card className="glass-card border-neon-purple/30 p-8 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground font-rajdhani">
          You're not participating in any active raffles
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        {participatingRaffles.map((raffle) => {
          const progress = (raffle.tickets_sold / raffle.max_tickets) * 100;
          const won = isWinner(raffle);
          
          return (
            <Card key={raffle.id} className={`glass-card ${won ? 'border-neon-gold/50 bg-neon-gold/5' : 'border-neon-purple/30'} p-6 hover:border-neon-purple/60 transition-all`}>
              <div className="flex flex-col md:flex-row gap-6">
                {raffle.image_url && (
                  <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={raffle.image_url} 
                      alt={raffle.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-orbitron font-bold text-2xl mb-2 text-neon-purple">
                        {raffle.name}
                      </h3>
                      <p className="text-muted-foreground font-rajdhani">
                        {raffle.description}
                      </p>
                    </div>
                    {won ? (
                      <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30">
                        <Award className="w-3 h-3 mr-1" />
                        WON!
                      </Badge>
                    ) : (
                      <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
                        <Trophy className="w-3 h-3 mr-1" />
                        {raffle.status === 'completed' ? 'Completed' : 'Participating'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-rajdhani">Prize</span>
                      <span className="font-rajdhani font-bold text-neon-gold">
                        {raffle.prize_description}
                      </span>
                    </div>
                    
                    {raffle.status === 'active' && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-rajdhani">Progress</span>
                            <span className="font-rajdhani font-bold">
                              {raffle.tickets_sold} / {raffle.max_tickets} tickets
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {raffle.draw_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>Draw {formatDistanceToNow(new Date(raffle.draw_date), { addSuffix: true })}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {won && (
                    <Button
                      onClick={() => handleClaim(raffle)}
                      className="w-full md:w-auto bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90 font-orbitron"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Claim Prize
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedRaffle && (
        <ClaimRewardForm
          open={claimFormOpen}
          onOpenChange={setClaimFormOpen}
          raffleName={selectedRaffle.name}
          prizeDescription={selectedRaffle.prize_description}
          raffleId={selectedRaffle.id}
          userId={userId}
        />
      )}
    </>
  );
};
