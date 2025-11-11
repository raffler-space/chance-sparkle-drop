import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, ExternalLink, Loader2, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  tx_hash: string;
  amount: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  raffles: {
    name: string;
  };
}

export const TransactionHistory = ({ userId, walletAddress }: { userId: string; walletAddress: string | null }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          raffles (
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data as any);
        setFilteredTransactions(data as any);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [userId]);

  useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.tx_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.raffles.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, statusFilter, transactions]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-card border-neon-gold/30 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction hash or raffle name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card className="glass-card border-neon-gold/30 p-8 text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground font-rajdhani">
            {transactions.length === 0 
              ? "No transactions yet"
              : "No transactions match your filters"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id} className="glass-card border-neon-gold/30 p-4 hover:border-neon-gold/60 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-rajdhani font-bold text-lg">{tx.raffles.name}</h4>
                    <Badge 
                      variant={
                        tx.status === 'confirmed' ? 'default' : 
                        tx.status === 'pending' ? 'secondary' : 
                        'destructive'
                      }
                      className="font-rajdhani"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-rajdhani font-bold text-neon-gold">
                        {tx.amount} USDT
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span className="font-rajdhani">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {tx.tx_hash}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-neon-gold/30 hover:border-neon-gold self-start md:self-center"
                  onClick={() => window.open(`https://etherscan.io/tx/${tx.tx_hash}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  View on Etherscan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
