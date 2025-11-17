import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface ReferralPayout {
  id: string;
  referrer_id: string;
  referred_id: string;
  raffle_id: number;
  amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface ReferrerSummary {
  referrer_id: string;
  total_pending: number;
  total_paid: number;
  pending_count: number;
  paid_count: number;
}

export default function ReferralPayouts() {
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [summary, setSummary] = useState<ReferrerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'paid'>('pending');

  useEffect(() => {
    loadPayouts();
  }, [viewMode]);

  const loadPayouts = async () => {
    try {
      setLoading(true);

      // Load individual payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('referral_earnings')
        .select('*')
        .eq('status', viewMode)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Load summary by referrer
      const { data: summaryData, error: summaryError } = await supabase
        .from('referral_earnings')
        .select('referrer_id, amount, status');

      if (summaryError) throw summaryError;

      // Calculate summary
      const summaryMap = summaryData?.reduce((acc, earning) => {
        if (!acc[earning.referrer_id]) {
          acc[earning.referrer_id] = {
            referrer_id: earning.referrer_id,
            total_pending: 0,
            total_paid: 0,
            pending_count: 0,
            paid_count: 0,
          };
        }

        if (earning.status === 'pending') {
          acc[earning.referrer_id].total_pending += Number(earning.amount);
          acc[earning.referrer_id].pending_count += 1;
        } else if (earning.status === 'paid') {
          acc[earning.referrer_id].total_paid += Number(earning.amount);
          acc[earning.referrer_id].paid_count += 1;
        }

        return acc;
      }, {} as Record<string, ReferrerSummary>) || {};

      setPayouts(payoutsData || []);
      setSummary(Object.values(summaryMap).filter(s => 
        viewMode === 'pending' ? s.total_pending > 0 : s.total_paid > 0
      ));
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast({
        title: "Error",
        description: "Failed to load referral payouts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (referrerId: string) => {
    try {
      setProcessing(referrerId);

      const { error } = await supabase
        .from('referral_earnings')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('referrer_id', referrerId)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payouts marked as paid",
      });

      loadPayouts();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "Failed to update payout status",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-orbitron text-2xl font-bold text-primary">
          💰 Referral Payouts Management
        </h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'pending' ? 'default' : 'outline'}
            onClick={() => setViewMode('pending')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending
          </Button>
          <Button
            variant={viewMode === 'paid' ? 'default' : 'outline'}
            onClick={() => setViewMode('paid')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Paid
          </Button>
        </div>
      </div>

      {/* Summary by Referrer */}
      <Card className="p-6">
        <h3 className="font-orbitron text-xl font-bold mb-4">Summary by Referrer</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer ID</TableHead>
              <TableHead className="text-right">
                {viewMode === 'pending' ? 'Pending' : 'Paid'} Amount
              </TableHead>
              <TableHead className="text-right">
                {viewMode === 'pending' ? 'Pending' : 'Paid'} Count
              </TableHead>
              {viewMode === 'pending' && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((s) => (
              <TableRow key={s.referrer_id}>
                <TableCell className="font-mono text-sm">
                  {s.referrer_id.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${viewMode === 'pending' ? s.total_pending.toFixed(2) : s.total_paid.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {viewMode === 'pending' ? s.pending_count : s.paid_count}
                </TableCell>
                {viewMode === 'pending' && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => markAsPaid(s.referrer_id)}
                      disabled={processing === s.referrer_id}
                    >
                      {processing === s.referrer_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Mark Paid
                        </>
                      )}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detailed Transactions */}
      <Card className="p-6">
        <h3 className="font-orbitron text-xl font-bold mb-4">Detailed Transactions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Referrer ID</TableHead>
              <TableHead>Raffle ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Commission %</TableHead>
              <TableHead>Status</TableHead>
              {viewMode === 'paid' && <TableHead>Paid At</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell>
                  {new Date(payout.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {payout.referrer_id.slice(0, 8)}...
                </TableCell>
                <TableCell>#{payout.raffle_id}</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  ${Number(payout.amount).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {payout.commission_rate}%
                </TableCell>
                <TableCell>
                  <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                    {payout.status}
                  </Badge>
                </TableCell>
                {viewMode === 'paid' && (
                  <TableCell>
                    {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
