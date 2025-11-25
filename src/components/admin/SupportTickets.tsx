import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  user_id: string;
  wallet_address: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

export function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdating(ticketId);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket status updated');
      loadTickets();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setUpdating(null);
    }
  };

  const submitResponse = async (ticketId: string) => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setUpdating(ticketId);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          admin_response: response.trim(),
          status: 'resolved'
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Response submitted successfully');
      setResponse('');
      setSelectedTicket(null);
      loadTickets();
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setUpdating(null);
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

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-orbitron font-bold text-neon-cyan glow-text-cyan">
          Support Tickets
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] glass-card border-neon-cyan/30">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTickets.length === 0 ? (
        <Card className="glass-card border-neon-cyan/30 p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground font-rajdhani">
            {statusFilter === 'all' ? 'No support tickets yet' : `No ${statusFilter} tickets`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
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
                  <p className="text-sm text-muted-foreground font-rajdhani mb-1">
                    User ID: <span className="font-mono">{ticket.wallet_address}</span>
                  </p>
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    Submitted: {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                  disabled={updating === ticket.id}
                >
                  <SelectTrigger className="w-[160px] glass-card border-neon-cyan/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-rajdhani font-bold">Message:</Label>
                <p className="text-sm font-rajdhani text-foreground whitespace-pre-wrap">
                  {ticket.message}
                </p>
              </div>

              {ticket.admin_response ? (
                <div className="p-4 glass-card border-neon-purple/30 rounded-lg">
                  <p className="text-sm font-rajdhani font-bold text-neon-purple mb-2">
                    Your Response:
                  </p>
                  <p className="text-sm font-rajdhani text-foreground whitespace-pre-wrap">
                    {ticket.admin_response}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTicket === ticket.id ? (
                    <>
                      <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Type your response..."
                        className="glass-card border-neon-cyan/30 min-h-[100px]"
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => submitResponse(ticket.id)}
                          disabled={updating === ticket.id}
                          className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 font-rajdhani"
                        >
                          {updating === ticket.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Response
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedTicket(null);
                            setResponse('');
                          }}
                          variant="outline"
                          className="glass-card border-neon-cyan/30 font-rajdhani"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      onClick={() => setSelectedTicket(ticket.id)}
                      variant="outline"
                      className="glass-card border-neon-cyan/30 font-rajdhani"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add Response
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
