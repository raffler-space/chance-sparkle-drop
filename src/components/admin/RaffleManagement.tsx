import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Raffle {
  id: number;
  name: string;
  description: string;
  prize_description: string;
  ticket_price: number;
  max_tickets: number;
  tickets_sold: number;
  nft_collection_address: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

export const RaffleManagement = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prize_description: '',
    ticket_price: '',
    max_tickets: '',
    nft_collection_address: '',
    image_url: '',
  });

  useEffect(() => {
    fetchRaffles();
  }, []);

  const fetchRaffles = async () => {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRaffles(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const raffleData = {
      name: formData.name,
      description: formData.description,
      prize_description: formData.prize_description,
      ticket_price: parseFloat(formData.ticket_price),
      max_tickets: parseInt(formData.max_tickets),
      nft_collection_address: formData.nft_collection_address,
      image_url: formData.image_url || null,
    };

    if (editingRaffle) {
      const { error } = await supabase
        .from('raffles')
        .update(raffleData)
        .eq('id', editingRaffle.id);

      if (error) {
        toast.error('Failed to update raffle');
      } else {
        toast.success('Raffle updated successfully');
      }
    } else {
      const { error } = await supabase
        .from('raffles')
        .insert([raffleData]);

      if (error) {
        toast.error('Failed to create raffle');
      } else {
        toast.success('Raffle created successfully');
      }
    }

    setDialogOpen(false);
    setEditingRaffle(null);
    resetForm();
    fetchRaffles();
  };

  const handleEdit = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setFormData({
      name: raffle.name,
      description: raffle.description || '',
      prize_description: raffle.prize_description,
      ticket_price: raffle.ticket_price.toString(),
      max_tickets: raffle.max_tickets.toString(),
      nft_collection_address: raffle.nft_collection_address,
      image_url: raffle.image_url || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this raffle?')) return;

    const { error } = await supabase
      .from('raffles')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete raffle');
    } else {
      toast.success('Raffle deleted successfully');
      fetchRaffles();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prize_description: '',
      ticket_price: '',
      max_tickets: '',
      nft_collection_address: '',
      image_url: '',
    });
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
      <Button
        onClick={() => {
          resetForm();
          setEditingRaffle(null);
          setDialogOpen(true);
        }}
        className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 text-white font-orbitron"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create New Raffle
      </Button>

      <div className="grid gap-4">
        {raffles.map((raffle) => (
          <Card key={raffle.id} className="glass-card border-neon-cyan/30 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-orbitron font-bold text-xl">{raffle.name}</h3>
                  <Badge>{raffle.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{raffle.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Prize:</span>
                    <p className="font-rajdhani font-bold text-neon-gold">{raffle.prize_description}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <p className="font-rajdhani font-bold">{raffle.ticket_price} USDT</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tickets:</span>
                    <p className="font-rajdhani font-bold">{raffle.tickets_sold} / {raffle.max_tickets}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Collection:</span>
                    <p className="font-mono text-xs truncate">{raffle.nft_collection_address}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(raffle)}
                  className="border-neon-cyan/30 hover:border-neon-cyan"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(raffle.id)}
                  className="border-destructive/30 hover:border-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-neon-cyan/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-orbitron">
              {editingRaffle ? 'Edit Raffle' : 'Create New Raffle'}
            </DialogTitle>
            <DialogDescription>
              {editingRaffle ? 'Update the raffle details' : 'Fill in the details to create a new raffle'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Raffle Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prize">Prize Description</Label>
                <Input
                  id="prize"
                  value={formData.prize_description}
                  onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket_price">Ticket Price (USDT)</Label>
                <Input
                  id="ticket_price"
                  type="number"
                  step="0.01"
                  value={formData.ticket_price}
                  onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tickets">Max Tickets</Label>
                <Input
                  id="max_tickets"
                  type="number"
                  value={formData.max_tickets}
                  onChange={(e) => setFormData({ ...formData, max_tickets: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nft_address">NFT Collection Address</Label>
              <Input
                id="nft_address"
                value={formData.nft_collection_address}
                onChange={(e) => setFormData({ ...formData, nft_collection_address: e.target.value })}
                placeholder="0x..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (Optional)</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingRaffle(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90"
              >
                {editingRaffle ? 'Update Raffle' : 'Create Raffle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
