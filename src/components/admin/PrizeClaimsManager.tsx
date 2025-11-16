import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PrizeClaim {
  id: string;
  raffle_id: number;
  user_id: string;
  delivery_info: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  raffles: {
    name: string;
    prize_description: string;
  };
}

export const PrizeClaimsManager = () => {
  const [claims, setClaims] = useState<PrizeClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from('prize_claims')
      .select(`
        *,
        raffles (
          name,
          prize_description
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClaims(data as any);
    }
    setLoading(false);
  };

  const updateClaimStatus = async (claimId: string, newStatus: string) => {
    setProcessingId(claimId);
    try {
      const { error } = await supabase
        .from('prize_claims')
        .update({ 
          status: newStatus,
          processed_at: newStatus === 'processed' ? new Date().toISOString() : null
        })
        .eq('id', claimId);

      if (error) throw error;

      toast.success(`Claim ${newStatus === 'processed' ? 'marked as processed' : 'rejected'}`);
      fetchClaims();
    } catch (error: any) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <Card className="glass-card border-neon-gold/30 p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground font-rajdhani">
          No prize claims yet
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-orbitron font-bold text-neon-gold">Prize Claims</h2>
        <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
          {claims.filter(c => c.status === 'pending').length} Pending
        </Badge>
      </div>

      {claims.map((claim) => (
        <Card key={claim.id} className="glass-card border-neon-purple/30 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-orbitron font-bold text-xl text-neon-purple mb-1">
                  {claim.raffles.name}
                </h3>
                <p className="text-sm text-muted-foreground font-rajdhani">
                  Prize: {claim.raffles.prize_description}
                </p>
              </div>
              <Badge 
                className={
                  claim.status === 'pending' 
                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                    : claim.status === 'processed'
                    ? 'bg-green-500/20 text-green-500 border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border-red-500/30'
                }
              >
                {claim.status.toUpperCase()}
              </Badge>
            </div>

            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <p className="text-sm font-rajdhani font-bold mb-2">Delivery Information:</p>
              <p className="text-sm text-muted-foreground font-rajdhani whitespace-pre-wrap">
                {claim.delivery_info}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-rajdhani">
                Submitted {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
              </span>
              {claim.processed_at && (
                <span className="font-rajdhani">
                  Processed {formatDistanceToNow(new Date(claim.processed_at), { addSuffix: true })}
                </span>
              )}
            </div>

            {claim.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => updateClaimStatus(claim.id, 'processed')}
                  disabled={processingId === claim.id}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Processed
                </Button>
                <Button
                  onClick={() => updateClaimStatus(claim.id, 'rejected')}
                  disabled={processingId === claim.id}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
