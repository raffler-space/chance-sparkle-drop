import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '@/hooks/useWeb3';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

export function SupportTab({ userId, walletAddress }: { userId?: string; walletAddress?: string | null }) {
  const { account } = useWeb3();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userId || walletAddress || account) {
      loadTickets();
    }
  }, [userId, walletAddress, account]);

  const loadTickets = async () => {
    try {
      let query = supabase
        .from('support_tickets')
        .select('*');

      // Query by userId if available, otherwise by wallet address
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (walletAddress || account) {
        query = query.eq('wallet_address', (walletAddress || account)!.toLowerCase());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please sign in to submit a support ticket');
      return;
    }
    
    const wallet = walletAddress || account;
    if (!wallet) {
      toast.error('Please connect your wallet to submit a ticket');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          wallet_address: wallet,
          subject: subject.trim(),
          message: message.trim(),
          status: 'open'
        });

      if (error) throw error;

      toast.success('Support ticket submitted successfully');
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30';
      case 'in_progress':
        return 'bg-neon-purple/20 text-neon-purple border-neon-purple/30';
      case 'resolved':
        return 'bg-neon-gold/20 text-neon-gold border-neon-gold/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-neon-cyan/30 p-6">
        <h2 className="text-2xl font-orbitron font-bold mb-4 text-neon-cyan glow-text-cyan">
          Submit Support Ticket
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="font-rajdhani">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="glass-card border-neon-cyan/30"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="font-rajdhani">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide details about your issue..."
              className="glass-card border-neon-cyan/30 min-h-[120px]"
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-rajdhani text-muted-foreground">Your Wallet Address</Label>
            <p className="text-sm font-mono break-all text-foreground">
              {account || 'Not connected'}
            </p>
          </div>
          <Button
            type="submit"
            disabled={submitting || !account || !userId}
            className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 font-rajdhani"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Submit Ticket
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-orbitron font-bold text-neon-cyan glow-text-cyan">
          Your Tickets
        </h2>
        {tickets.length === 0 ? (
          <Card className="glass-card border-neon-cyan/30 p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-rajdhani">
              No support tickets yet
            </p>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="glass-card border-neon-cyan/30 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-rajdhani font-bold text-foreground">
                      {ticket.subject}
                    </h3>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-rajdhani mb-2">
                    Submitted: {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-rajdhani text-foreground whitespace-pre-wrap">
                  {ticket.message}
                </p>
              </div>

              {ticket.admin_response && (
                <div className="mt-4 p-4 glass-card border-neon-purple/30 rounded-lg">
                  <p className="text-sm font-rajdhani font-bold text-neon-purple mb-2">
                    Admin Response:
                  </p>
                  <p className="text-sm font-rajdhani text-foreground whitespace-pre-wrap">
                    {ticket.admin_response}
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
