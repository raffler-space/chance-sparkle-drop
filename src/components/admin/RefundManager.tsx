import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/hooks/useWeb3';
import { useUSDTContract } from '@/hooks/useUSDTContract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, DollarSign, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Raffle {
  id: number;
  name: string;
  ticket_price: number;
  tickets_sold: number;
  status: string;
}

interface Refund {
  id: string;
  user_id: string;
  wallet_address: string;
  amount: number;
  status: string;
  tx_hash: string | null;
}

export const RefundManager = () => {
  const { account, chainId } = useWeb3();
  const { isContractReady, transfer } = useUSDTContract(chainId, account);
  
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffleId, setSelectedRaffleId] = useState<number | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchRefundingRaffles();
  }, []);

  useEffect(() => {
    if (selectedRaffleId) {
      fetchRefunds(selectedRaffleId);
    }
  }, [selectedRaffleId]);

  const checkRaffleStatuses = async () => {
    setCheckingStatus(true);
    try {
      const { data: rafflesData, error: rafflesError } = await supabase
        .from('raffles')
        .select('id, name, status, draw_date, tickets_sold, max_tickets')
        .not('draw_date', 'is', null)
        .in('status', ['active', 'live', 'completed']);

      if (rafflesError) throw rafflesError;

      let updatedCount = 0;
      const now = new Date();

      for (const raffle of rafflesData || []) {
        const drawDate = new Date(raffle.draw_date);
        const soldPercentage = (raffle.tickets_sold / raffle.max_tickets) * 100;

        // If draw date has passed and less than 99% tickets sold, mark for refund
        if (drawDate < now && soldPercentage < 99) {
          const { error: updateError } = await supabase
            .from('raffles')
            .update({ status: 'Refunding' })
            .eq('id', raffle.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      toast.success(`Updated ${updatedCount} raffle(s) to refunding status`);
      fetchRefundingRaffles();
    } catch (error) {
      console.error('Error checking raffle statuses:', error);
      toast.error('Failed to check raffle statuses');
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchRefundingRaffles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('status', 'Refunding')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch raffles');
      console.error(error);
    } else {
      // Fetch actual ticket counts from tickets table
      const rafflesWithTickets = await Promise.all(
        (data || []).map(async (raffle) => {
          const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select('quantity')
            .eq('raffle_id', raffle.id);
          
          if (!ticketsError && tickets) {
            const actualTicketsSold = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
            return { ...raffle, tickets_sold: actualTicketsSold };
          }
          return raffle;
        })
      );
      
      setRaffles(rafflesWithTickets);
      if (rafflesWithTickets && rafflesWithTickets.length > 0 && !selectedRaffleId) {
        setSelectedRaffleId(rafflesWithTickets[0].id);
      }
    }
    setLoading(false);
  };

  const fetchRefunds = async (raffleId: number) => {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('raffle_id', raffleId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch refunds');
      console.error(error);
    } else {
      setRefunds(data || []);
    }
  };

  const initializeRefunds = async (raffleId: number) => {
    setProcessing(true);
    try {
      // Fetch all tickets for this raffle
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('user_id, wallet_address, purchase_price')
        .eq('raffle_id', raffleId);

      if (ticketsError) throw ticketsError;

      // Group by user and sum amounts
      const userRefunds = tickets.reduce((acc, ticket) => {
        if (!acc[ticket.user_id]) {
          acc[ticket.user_id] = {
            wallet_address: ticket.wallet_address,
            amount: 0
          };
        }
        acc[ticket.user_id].amount += ticket.purchase_price;
        return acc;
      }, {} as Record<string, { wallet_address: string; amount: number }>);

      // Insert refund records
      const refundRecords = Object.entries(userRefunds).map(([userId, data]) => ({
        raffle_id: raffleId,
        user_id: userId,
        wallet_address: data.wallet_address,
        amount: data.amount,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('refunds')
        .insert(refundRecords);

      if (insertError) throw insertError;

      toast.success('Refund records initialized successfully');
      fetchRefunds(raffleId);
    } catch (error) {
      console.error('Error initializing refunds:', error);
      toast.error('Failed to initialize refunds');
    } finally {
      setProcessing(false);
    }
  };

  const processBatchRefund = async () => {
    if (!transfer || !isContractReady) {
      toast.error('USDT contract not ready');
      return;
    }

    const pendingRefunds = refunds.filter(r => r.status === 'pending');
    if (pendingRefunds.length === 0) {
      toast.error('No pending refunds to process');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const refund of pendingRefunds) {
      try {
        // Update status to processing
        await supabase
          .from('refunds')
          .update({ status: 'processing' })
          .eq('id', refund.id);

        // Execute transfer using the hook's transfer function
        const tx = await transfer(refund.wallet_address, refund.amount.toString());
        await tx.wait();

        // Update refund record with success
        await supabase
          .from('refunds')
          .update({
            status: 'completed',
            tx_hash: tx.hash,
            processed_at: new Date().toISOString()
          })
          .eq('id', refund.id);

        successCount++;
        toast.success(`Refunded ${refund.amount} USDT to ${refund.wallet_address.slice(0, 6)}...`);
      } catch (error) {
        console.error('Refund failed:', error);
        failCount++;
        
        // Update status to failed
        await supabase
          .from('refunds')
          .update({ status: 'failed' })
          .eq('id', refund.id);

        toast.error(`Failed to refund ${refund.wallet_address.slice(0, 6)}...`);
      }
    }

    setProcessing(false);
    toast.success(`Batch refund complete: ${successCount} successful, ${failCount} failed`);
    
    if (selectedRaffleId) {
      fetchRefunds(selectedRaffleId);
    }
  };

  const retryFailedRefund = async (refund: Refund) => {
    if (!transfer || !isContractReady) {
      toast.error('USDT contract not ready');
      return;
    }

    setProcessing(true);
    try {
      await supabase
        .from('refunds')
        .update({ status: 'processing' })
        .eq('id', refund.id);

      const tx = await transfer(refund.wallet_address, refund.amount.toString());
      await tx.wait();

      await supabase
        .from('refunds')
        .update({
          status: 'completed',
          tx_hash: tx.hash,
          processed_at: new Date().toISOString()
        })
        .eq('id', refund.id);

      toast.success('Refund completed successfully');
      if (selectedRaffleId) {
        fetchRefunds(selectedRaffleId);
      }
    } catch (error) {
      console.error('Retry failed:', error);
      await supabase
        .from('refunds')
        .update({ status: 'failed' })
        .eq('id', refund.id);
      toast.error('Refund retry failed');
    } finally {
      setProcessing(false);
    }
  };

  const selectedRaffle = raffles.find(r => r.id === selectedRaffleId);
  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
  const pendingCount = refunds.filter(r => r.status === 'pending').length;
  const completedCount = refunds.filter(r => r.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <Card className="glass-card border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-orbitron text-neon-cyan">Refund Management</CardTitle>
            <CardDescription>No raffles requiring refunds</CardDescription>
          </div>
          <Button
            onClick={checkRaffleStatuses}
            disabled={checkingStatus}
            className="bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
          >
            {checkingStatus ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Raffle Statuses
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>No raffles with 'Refunding' status found.</p>
            <p className="text-sm mt-2">Click "Check Raffle Statuses" to scan for raffles that need refunds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Raffle Selection */}
      <Card className="glass-card border-neon-cyan/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-orbitron text-neon-cyan">Select Raffle to Refund</CardTitle>
            <CardDescription>Choose a failed raffle to process refunds</CardDescription>
          </div>
          <Button
            onClick={checkRaffleStatuses}
            disabled={checkingStatus}
            variant="outline"
            className="bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
          >
            {checkingStatus ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {raffles.map((raffle) => (
              <Card
                key={raffle.id}
                className={`cursor-pointer transition-all ${
                  selectedRaffleId === raffle.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedRaffleId(raffle.id)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-orbitron">{raffle.name}</CardTitle>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tickets Sold: {raffle.tickets_sold || 0}</span>
                    <span>{raffle.ticket_price} USDT</span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Refund Stats & Actions */}
      {selectedRaffle && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="glass-card border-neon-purple/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Refund</CardTitle>
                <DollarSign className="h-4 w-4 text-neon-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neon-purple">
                  {totalRefundAmount.toFixed(2)} USDT
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-neon-gold/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-neon-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neon-gold">{refunds.length}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-accent/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <RefreshCw className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{pendingCount}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-secondary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <RefreshCw className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{completedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="font-orbitron">Refund Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              {refunds.length === 0 ? (
                <Button
                  onClick={() => initializeRefunds(selectedRaffle.id)}
                  disabled={processing}
                  className="bg-primary hover:bg-primary/90"
                >
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Initialize Refunds
                </Button>
              ) : (
                <>
                  <Button
                    onClick={processBatchRefund}
                    disabled={processing || pendingCount === 0 || !isContractReady}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Process Batch Refund ({pendingCount})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fetchRefunds(selectedRaffle.id)}
                    disabled={processing}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Refunds Table */}
          {refunds.length > 0 && (
            <Card className="glass-card border-border/30">
              <CardHeader>
                <CardTitle className="font-orbitron">Refund Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Amount (USDT)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell className="font-mono text-xs">
                          {refund.wallet_address.slice(0, 6)}...{refund.wallet_address.slice(-4)}
                        </TableCell>
                        <TableCell>{refund.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              refund.status === 'completed'
                                ? 'default'
                                : refund.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {refund.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {refund.tx_hash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${refund.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {refund.tx_hash.slice(0, 6)}...{refund.tx_hash.slice(-4)}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {refund.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryFailedRefund(refund)}
                              disabled={processing}
                            >
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
