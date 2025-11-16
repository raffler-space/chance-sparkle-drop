import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClaimRewardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raffleName: string;
  prizeDescription: string;
  raffleId: number;
  userId: string;
}

export const ClaimRewardForm = ({ 
  open, 
  onOpenChange, 
  raffleName, 
  prizeDescription, 
  raffleId,
  userId 
}: ClaimRewardFormProps) => {
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!deliveryInfo.trim()) {
      toast.error('Please provide your delivery information');
      return;
    }

    setIsSubmitting(true);
    try {
      // Store claim request in database (you'll need to create this table)
      const { error } = await supabase
        .from('prize_claims')
        .insert({
          raffle_id: raffleId,
          user_id: userId,
          delivery_info: deliveryInfo.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Claim request submitted! Admin will contact you soon.');
      onOpenChange(false);
      setDeliveryInfo('');
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      toast.error(error.message || 'Failed to submit claim request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-neon-gold/50">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl text-neon-gold">
            Claim Your Prize
          </DialogTitle>
          <DialogDescription className="font-rajdhani text-base">
            Provide your delivery information for: <strong>{raffleName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 glass-card border-neon-cyan/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Prize</p>
            <p className="font-rajdhani font-bold text-neon-cyan">{prizeDescription}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-info" className="font-rajdhani">
              Delivery Information
            </Label>
            <Textarea
              id="delivery-info"
              placeholder="Please provide your contact information and delivery address (email, phone, address, etc.)"
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
              className="min-h-[120px] bg-background/50 border-border/50 font-rajdhani"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Our admin team will review your claim and contact you to coordinate prize delivery.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90 font-orbitron"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
