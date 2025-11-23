import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2, ExternalLink, Eye, EyeOff, Clock, Filter, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { getNetworkConfig } from '@/config/contracts';
import { ethers } from 'ethers';

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
  draw_tx_hash: string | null;
  draw_date: string | null;
  launch_time: string | null;
  display_order: number;
  show_on_home: boolean;
  show_on_raffles: boolean;
  contract_raffle_id: number | null;
  detailed_description: string | null;
  rules: string | null;
  network: string;
  duration_days: number | null;
}

const calculateTimeRemaining = (raffle: Raffle): { time: string; label: string } => {
  const now = new Date().getTime();
  let targetDate: string | null = null;
  let label = '';
  
  // Draft raffles: countdown to launch_time
  if (raffle.status === 'draft' && raffle.launch_time) {
    targetDate = raffle.launch_time;
    label = 'Launches in:';
  }
  // Active raffles: countdown to draw_date
  else if (raffle.status === 'active' && raffle.draw_date) {
    targetDate = raffle.draw_date;
    label = 'Ends in:';
  }
  
  if (!targetDate) return { time: 'No date set', label: '' };
  
  const end = new Date(targetDate).getTime();
  const diff = end - now;
  
  if (diff <= 0) return { time: raffle.status === 'draft' ? 'Ready to launch' : 'Ended', label: '' };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let time = '';
  if (days > 0) time = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) time = `${hours}h ${minutes}m`;
  else time = `${minutes}m`;
  
  return { time, label };
};

export const RaffleManagement = () => {
  const { account, chainId } = useWeb3();
  const raffleContract = useRaffleContract(chainId, account);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: number]: { time: string; label: string } }>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at_desc');
  const [syncingRaffles, setSyncingRaffles] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prize_description: '',
    ticket_price: '',
    max_tickets: '',
    nft_collection_address: '',
    image_url: '',
    duration_days: '7', // 7 days default
    status: 'active', // 'active' or 'draft'
    launch_time: '', // Launch time for draft raffles
    display_order: '1',
    show_on_home: true,
    show_on_raffles: true,
    detailed_description: '',
    rules: '',
    network: 'mainnet', // Default to mainnet
  });

  useEffect(() => {
    fetchRaffles();
  }, [raffleContract.isContractReady, chainId]);

  useEffect(() => {
    const updateTimers = () => {
      const newTimeRemaining: { [key: number]: { time: string; label: string } } = {};
      raffles.forEach(raffle => {
        newTimeRemaining[raffle.id] = calculateTimeRemaining(raffle);
      });
      setTimeRemaining(newTimeRemaining);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [raffles]);

  const fetchRaffles = async () => {
    // First, fetch all raffles from the blockchain if contract is ready
    let chainRaffles: any[] = [];
    if (raffleContract.isContractReady && raffleContract.contract && chainId) {
      try {
        console.log(`Fetching all raffles from ${chainId === 1 ? 'Mainnet' : 'Sepolia'} contract...`);
        chainRaffles = await raffleContract.getAllRafflesFromChain();
        console.log(`Found ${chainRaffles.length} raffles on blockchain`);
      } catch (error) {
        console.error('Error fetching raffles from blockchain:', error);
        toast.error('Failed to fetch raffles from blockchain');
      }
    }

    // Then fetch from database
    const { data: dbRaffles, error } = await supabase
      .from('raffles')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching raffles from database:', error);
      setLoading(false);
      return;
    }

    // Merge blockchain and database data
    const mergedRaffles = [];
    
    // First, add all database raffles and update with blockchain data
    for (const dbRaffle of dbRaffles || []) {
      const chainRaffle = chainRaffles.find(
        (cr) => cr.contractRaffleId === dbRaffle.contract_raffle_id
      );
      
      if (chainRaffle) {
        // Update with fresh blockchain data
        mergedRaffles.push({
          ...dbRaffle,
          tickets_sold: chainRaffle.ticketsSold,
          winner_address: chainRaffle.winner !== ethers.constants.AddressZero ? chainRaffle.winner : null,
          status: !chainRaffle.isActive ? 'completed' : dbRaffle.status,
        });
      } else {
        // Keep database raffle as-is (might be a draft)
        mergedRaffles.push(dbRaffle);
      }
    }

    // Then, check for any blockchain raffles not in database
    for (const chainRaffle of chainRaffles) {
      const existsInDb = (dbRaffles || []).some(
        (dbRaffle) => dbRaffle.contract_raffle_id === chainRaffle.contractRaffleId
      );
      
      if (!existsInDb) {
        console.warn(`⚠️ Raffle #${chainRaffle.contractRaffleId} exists on blockchain but not in database!`);
        toast.error(
          `Found raffle #${chainRaffle.contractRaffleId} "${chainRaffle.name}" on blockchain but missing in database. Please sync or add manually.`,
          { duration: 8000 }
        );
        
        // Add as a "blockchain-only" raffle with special flag
        mergedRaffles.push({
          id: -chainRaffle.contractRaffleId, // Negative ID to indicate it's not in DB
          contract_raffle_id: chainRaffle.contractRaffleId,
          name: chainRaffle.name + ' ⚠️ (On-chain only)',
          description: chainRaffle.description,
          prize_description: 'See blockchain data',
          ticket_price: parseFloat(chainRaffle.ticketPrice),
          max_tickets: chainRaffle.maxTickets,
          tickets_sold: chainRaffle.ticketsSold,
          nft_collection_address: chainRaffle.nftContract,
          status: chainRaffle.isActive ? 'active' : 'completed',
          winner_address: chainRaffle.winner !== ethers.constants.AddressZero ? chainRaffle.winner : null,
          image_url: null,
          created_at: new Date().toISOString(),
          draw_tx_hash: null,
          launch_time: null,
          display_order: 999,
          show_on_home: false,
          show_on_raffles: false,
          detailed_description: null,
          rules: null,
          // Store original blockchain data for syncing
          endTime: chainRaffle.endTime,
          ticketPrice: chainRaffle.ticketPrice,
          maxTickets: chainRaffle.maxTickets,
          nftContract: chainRaffle.nftContract,
          isActive: chainRaffle.isActive,
          // Flag to identify blockchain-only raffles
          _blockchainOnly: true,
        });
      }
    }

    setRaffles(mergedRaffles);
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
      status: formData.status,
      launch_time: formData.status === 'draft' && formData.launch_time ? new Date(formData.launch_time).toISOString() : null,
      display_order: parseInt(formData.display_order),
      show_on_home: formData.show_on_home,
      show_on_raffles: formData.show_on_raffles,
      detailed_description: formData.detailed_description || null,
      rules: formData.rules || null,
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
      network: chainId === 1 ? 'mainnet' : 'testnet',
    };

    if (editingRaffle) {
      // Edit only updates Supabase (can't edit on-chain)
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
      // Creating a new raffle
      
      // Check if this is a draft or active raffle
      if (formData.status === 'draft') {
        // Draft raffle - save to Supabase only, no blockchain deployment
        try {
          setIsProcessing(true);
          
          const drawDate = new Date(Date.now() + parseFloat(formData.duration_days) * 24 * 60 * 60 * 1000);

          const { data, error } = await supabase.functions.invoke('admin-create-raffle', {
            body: {
              raffleData: {
                ...raffleData,
                draw_date: drawDate.toISOString(),
              },
              contractRaffleId: null, // No contract ID for drafts
            },
          });

          if (error || !data?.success) {
            toast.error('Failed to create draft raffle');
            console.error('Edge function error:', error);
          } else {
            toast.success('Draft raffle created! You can activate it later from the raffle list.');
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to create draft raffle');
          console.error('Error:', error);
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Active raffle - deploy to blockchain first
        console.log('=== Raffle Creation Debug ===');
        console.log('Account:', account);
        console.log('ChainId:', chainId);
        console.log('Contract Ready:', raffleContract.isContractReady);

        if (!account) {
          toast.error('Please connect your wallet first');
          return;
        }

        const network = chainId ? getNetworkConfig(chainId) : null;
        if (!network) {
          toast.error('Please connect to a supported network');
          return;
        }
        
        if (!raffleContract.isContractReady || !raffleContract.contract) {
          toast.error('Contract not initialized. Please ensure you are on the correct network.');
          console.error('Contract not ready. ChainId:', chainId);
          return;
        }

        try {
          setIsProcessing(true);
          
          // Check ownership first
          console.log('Checking contract ownership...');
          const owner = await raffleContract.checkOwner();
          console.log('Contract owner:', owner);
          console.log('Your address:', account);
          
          if (owner && owner.toLowerCase() !== account.toLowerCase()) {
            toast.error(
              `You are not the contract owner. Contract owner is: ${owner}. Your address: ${account}. You need to deploy your own contract.`,
              { duration: 10000 }
            );
            setIsProcessing(false);
            return;
          }
          
          toast.loading('Creating raffle on blockchain...', { id: 'blockchain-tx' });
          
          const raffleId = await raffleContract.createRaffle(
            formData.name,
            formData.description,
            formData.ticket_price,
            parseInt(formData.max_tickets),
            parseFloat(formData.duration_days),
            formData.nft_collection_address || undefined
          );

          if (raffleId !== null) {
            toast.success('Raffle created on blockchain!', { id: 'blockchain-tx' });
            
            // Now save to Supabase via secure Edge Function
            const drawDate = new Date(Date.now() + parseFloat(formData.duration_days) * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase.functions.invoke('admin-create-raffle', {
              body: {
                raffleData: {
                  ...raffleData,
                  draw_date: drawDate.toISOString(),
                },
                contractRaffleId: raffleId !== null ? parseInt(raffleId) : null,
              },
            });

            if (error || !data?.success) {
              toast.error('Saved to blockchain but failed to save to database');
              console.error('Edge function error:', error);
            } else {
              toast.success('Raffle created successfully!');
            }
          } else {
            toast.error('Failed to create raffle on blockchain', { id: 'blockchain-tx' });
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to create raffle', { id: 'blockchain-tx' });
          console.error('Contract error:', error);
        } finally {
          setIsProcessing(false);
        }
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
      duration_days: raffle.duration_days?.toString() || '7',
      status: raffle.status || 'active',
      launch_time: raffle.launch_time ? new Date(raffle.launch_time).toISOString().slice(0, 16) : '',
      display_order: raffle.display_order?.toString() || '1',
      show_on_home: raffle.show_on_home,
      show_on_raffles: raffle.show_on_raffles,
      detailed_description: raffle.detailed_description || '',
      rules: raffle.rules || '',
      network: raffle.network || 'mainnet',
    });
    setDialogOpen(true);
  };

  const syncBlockchainRaffleToDatabase = async (chainRaffle: any) => {
    try {
      setIsProcessing(true);
      
      // Validate endTime from blockchain
      if (!chainRaffle.endTime || chainRaffle.endTime === 0) {
        toast.error('Invalid raffle end time from blockchain. Cannot sync.');
        console.error('Invalid endTime:', chainRaffle.endTime);
        setIsProcessing(false);
        return;
      }
      
      // Calculate draw date (use endTime from blockchain)
      const drawDate = new Date(chainRaffle.endTime * 1000);
      
      // Validate the date object
      if (isNaN(drawDate.getTime())) {
        toast.error('Failed to parse raffle end time. Cannot sync.');
        console.error('Invalid date from endTime:', chainRaffle.endTime);
        setIsProcessing(false);
        return;
      }
      
      console.log('Syncing raffle with draw date:', drawDate.toISOString());
      
      const { data, error } = await supabase.functions.invoke('admin-create-raffle', {
        body: {
          raffleData: {
            name: chainRaffle.name.replace(' ⚠️ (On-chain only)', ''),
            description: chainRaffle.description || '',
            prize_description: 'Synced from blockchain',
            ticket_price: parseFloat(chainRaffle.ticketPrice),
            max_tickets: chainRaffle.maxTickets,
            nft_collection_address: chainRaffle.nftContract,
            image_url: null,
            status: chainRaffle.isActive ? 'active' : 'completed',
            draw_date: drawDate.toISOString(),
            show_on_home: false,
            show_on_raffles: false,
            network: chainId === 1 ? 'mainnet' : 'testnet',
          },
          contractRaffleId: chainRaffle.contractRaffleId,
        },
      });

      if (error || !data?.success) {
        toast.error('Failed to sync raffle to database');
        console.error('Edge function error:', error);
      } else {
        toast.success('Raffle synced to database successfully!');
        fetchRaffles();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync raffle');
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
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
      duration_days: '7',
      status: 'draft', // Default to draft
      launch_time: '',
      display_order: '1',
      show_on_home: true,
      show_on_raffles: true,
      detailed_description: '',
      rules: '',
      network: chainId === 1 ? 'mainnet' : 'testnet',
    });
    setEditingRaffle(null);
    setDialogOpen(false);
  };

  // Filter and sort raffles
  const filteredAndSortedRaffles = raffles
    .filter(raffle => {
      if (statusFilter !== 'all' && raffle.status !== statusFilter) return false;
      if (networkFilter !== 'all' && raffle.network !== networkFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_at_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'draw_date_asc':
          if (!a.draw_date) return 1;
          if (!b.draw_date) return -1;
          return new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime();
        case 'draw_date_desc':
          if (!a.draw_date) return 1;
          if (!b.draw_date) return -1;
          return new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime();
        case 'price_asc':
          return a.ticket_price - b.ticket_price;
        case 'price_desc':
          return b.ticket_price - a.ticket_price;
        case 'tickets_asc':
          return (a.tickets_sold || 0) - (b.tickets_sold || 0);
        case 'tickets_desc':
          return (b.tickets_sold || 0) - (a.tickets_sold || 0);
        case 'position_asc':
          return (a.display_order || 0) - (b.display_order || 0);
        case 'position_desc':
          return (b.display_order || 0) - (a.display_order || 0);
        default:
          return 0;
      }
    });

  const handleActivateRaffle = async (raffle: Raffle) => {
    if (!account || !raffleContract.isContractReady || !raffleContract.contract) {
      toast.error('Please connect your wallet to activate raffle');
      return;
    }

    try {
      setIsProcessing(true);
      toast.info('Activating raffle on blockchain...', {
        description: 'Please confirm the transaction in your wallet',
      });

      // Create raffle on blockchain
      const network = chainId ? getNetworkConfig(chainId) : null;
      const usdtAddress = network?.contracts.usdt || '';

      const tx = await raffleContract.contract.createRaffle(
        ethers.utils.parseUnits(raffle.ticket_price.toString(), 6),
        raffle.max_tickets,
        Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
        raffle.nft_collection_address,
        usdtAddress
      );

      toast.info('Transaction submitted, waiting for confirmation...');
      const receipt = await tx.wait();
      
      // Get raffle ID from event
      const event = receipt.events?.find((e: any) => e.event === 'RaffleCreated');
      const contractRaffleId = event?.args?.raffleId?.toNumber();

      // Update raffle status to active
      const { error } = await supabase
        .from('raffles')
        .update({ 
          status: 'active',
          contract_raffle_id: contractRaffleId 
        })
        .eq('id', raffle.id);

      if (error) throw error;

      toast.success('Raffle activated successfully!');
      fetchRaffles();
    } catch (error: any) {
      console.error('Error activating raffle:', error);
      toast.error('Failed to activate raffle', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncTickets = async (raffle: Raffle) => {
    if (!raffle.contract_raffle_id && raffle.contract_raffle_id !== 0) {
      toast.error('This raffle has no blockchain contract');
      return;
    }

    try {
      setSyncingRaffles(prev => new Set(prev).add(raffle.id));
      toast.info('Syncing ticket data from blockchain...', {
        description: 'This may take a moment',
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('sync-raffle-tickets', {
        body: { raffleId: raffle.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to sync tickets');
      }

      const result = response.data;
      toast.success(`Synced successfully!`, {
        description: `${result.ticketRecordsCreated} ticket records stored permanently`,
      });

      // Refresh raffles to show updated ticket counts
      fetchRaffles();
    } catch (error: any) {
      console.error('Error syncing tickets:', error);
      toast.error('Failed to sync tickets', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSyncingRaffles(prev => {
        const next = new Set(prev);
        next.delete(raffle.id);
        return next;
      });
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-rajdhani">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="Refunding">Refunding</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-rajdhani">Network:</span>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="mainnet">Mainnet</SelectItem>
                <SelectItem value="testnet">Testnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-rajdhani">Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest</SelectItem>
                <SelectItem value="created_at_asc">Oldest</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="draw_date_asc">End Soon</SelectItem>
                <SelectItem value="draw_date_desc">End Later</SelectItem>
                <SelectItem value="price_asc">Price ↑</SelectItem>
                <SelectItem value="price_desc">Price ↓</SelectItem>
                <SelectItem value="tickets_asc">Tickets ↑</SelectItem>
                <SelectItem value="tickets_desc">Tickets ↓</SelectItem>
                <SelectItem value="position_asc">Position ↑</SelectItem>
                <SelectItem value="position_desc">Position ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setEditingRaffle(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 text-white font-orbitron"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {filteredAndSortedRaffles.length === 0 ? (
        <Card className="glass-card border-neon-cyan/30 p-12">
          <div className="text-center">
            <p className="text-muted-foreground font-rajdhani text-lg">
              {statusFilter === 'all' 
                ? 'No raffles found. Create your first raffle to get started.'
                : `No ${statusFilter} raffles found.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedRaffles.map((raffle) => (
          <Card key={raffle.id} className="glass-card border-neon-cyan/30 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-orbitron font-bold text-xl">{raffle.name}</h3>
                  <Badge 
                    className={
                      raffle.status === 'active' 
                        ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30' 
                        : raffle.status === 'completed'
                        ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30'
                        : raffle.status === 'draft'
                        ? 'bg-muted/20 text-muted-foreground border-muted/30'
                        : 'bg-muted/20 text-muted-foreground border-muted/30'
                    }
                  >
                    {raffle.status?.toUpperCase()}
                  </Badge>
                  <Badge 
                    className={`cursor-pointer transition-opacity hover:opacity-80 ${
                      raffle.network === 'mainnet'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                    onClick={async () => {
                      if (raffle.id < 0) return; // Can't update blockchain-only raffles
                      
                      const newNetwork = raffle.network === 'mainnet' ? 'testnet' : 'mainnet';
                      const { error } = await supabase
                        .from('raffles')
                        .update({ network: newNetwork })
                        .eq('id', raffle.id);
                      
                      if (error) {
                        toast.error('Failed to update network');
                      } else {
                        toast.success(`Network updated to ${newNetwork.toUpperCase()}`);
                        fetchRaffles();
                      }
                    }}
                  >
                    {raffle.network === 'mainnet' ? '🟢 MAINNET' : '🟡 TESTNET'}
                  </Badge>
                  {raffle.contract_raffle_id !== null && (
                    <Badge variant="outline" className="font-rajdhani border-neon-cyan/30">
                      On-chain #{raffle.contract_raffle_id}
                    </Badge>
                  )}
                  {(raffle as any)._blockchainOnly && (
                    <Badge variant="destructive" className="font-rajdhani animate-pulse">
                      ⚠️ Not in Database
                    </Badge>
                  )}
                  {raffle.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleActivateRaffle(raffle)}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90"
                    >
                      Activate Raffle
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{raffle.description}</p>
                
                {raffle.status === 'draft' && raffle.launch_time && (
                  <div className="mb-4 p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                    <p className="text-xs text-neon-cyan font-rajdhani">
                      Scheduled Launch: {new Date(raffle.launch_time).toLocaleString()}
                    </p>
                  </div>
                )}
                
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
                  <div>
                    <span className="text-muted-foreground">Position:</span>
                    <p className="font-rajdhani font-bold">#{raffle.display_order}</p>
                  </div>
                  {timeRemaining[raffle.id] && timeRemaining[raffle.id].label && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeRemaining[raffle.id].label}
                      </span>
                      <p className={`font-rajdhani font-bold ${raffle.status === 'draft' ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                        {timeRemaining[raffle.id].time}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={raffle.show_on_home}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from('raffles')
                          .update({ show_on_home: checked })
                          .eq('id', raffle.id);
                        
                        if (error) {
                          toast.error('Failed to update visibility');
                        } else {
                          toast.success(checked ? 'Raffle will show on home page' : 'Raffle hidden from home page');
                          fetchRaffles();
                        }
                      }}
                    />
                    <label className="text-sm font-rajdhani">
                      Show on Home Page
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={raffle.show_on_raffles}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from('raffles')
                          .update({ show_on_raffles: checked })
                          .eq('id', raffle.id);
                        
                        if (error) {
                          toast.error('Failed to update visibility');
                        } else {
                          toast.success(checked ? 'Raffle will show on raffles page' : 'Raffle hidden from raffles page');
                          fetchRaffles();
                        }
                      }}
                    />
                    <label className="text-sm font-rajdhani">
                      Show on Raffles Page
                    </label>
                  </div>
                </div>
                {raffle.draw_tx_hash && chainId && getNetworkConfig(chainId) && (
                  <div className="mt-4">
                    <a
                      href={`${getNetworkConfig(chainId)!.blockExplorer}/tx/${raffle.draw_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Etherscan
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                {(raffle as any)._blockchainOnly ? (
                  <>
                     <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        console.log('=== Blockchain Raffle Debug ===');
                        console.log('Full raffle object:', raffle);
                        console.log('endTime value:', (raffle as any).endTime);
                        console.log('endTime type:', typeof (raffle as any).endTime);
                        syncBlockchainRaffleToDatabase(raffle);
                      }}
                      disabled={isProcessing}
                      className="bg-neon-cyan text-background hover:bg-neon-cyan/90"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        'Sync to Database'
                      )}
                    </Button>
                    <Badge variant="outline" className="font-rajdhani text-xs">
                      Contract #{raffle.contract_raffle_id}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(raffle)}
                      className="border-neon-cyan/30 hover:border-neon-cyan"
                      disabled={raffle.id < 0}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(raffle.id)}
                      className="border-destructive/30 hover:border-destructive"
                      disabled={raffle.id < 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {(raffle.contract_raffle_id !== null && raffle.contract_raffle_id !== undefined) && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSyncTickets(raffle)}
                        className="border-neon-purple/30 hover:border-neon-purple"
                        disabled={syncingRaffles.has(raffle.id)}
                        title="Sync ticket data from blockchain"
                      >
                        {syncingRaffles.has(raffle.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
              </Card>
            ))}
          </div>
        )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-neon-cyan/30 max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-orbitron">
              {editingRaffle ? 'Edit Raffle' : 'Create New Raffle'}
            </DialogTitle>
            <DialogDescription>
              {editingRaffle ? 'Update the raffle details' : 'Fill in the details to create a new raffle'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {editingRaffle && editingRaffle.contract_raffle_id !== null && (
                  <div className="p-3 bg-warning/10 border border-warning rounded-md">
                    <p className="text-sm text-warning-foreground">
                      ⚠️ This raffle is deployed on-chain. Only display fields (name, description, images, visibility) can be edited.
                    </p>
                  </div>
                )}
                
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
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Brief description shown on raffle cards"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detailed_description">Detailed Description</Label>
                  <Textarea
                    id="detailed_description"
                    value={formData.detailed_description}
                    onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                    rows={4}
                    placeholder="Full description shown on raffle detail page"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules">Rules</Label>
                  <Textarea
                    id="rules"
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    rows={4}
                    placeholder="Raffle rules and terms"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket_price">Ticket Price (USDT)</Label>
                    <Input
                      id="ticket_price"
                      type="number"
                      step="0.01"
                      value={formData.ticket_price}
                      onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                      disabled={editingRaffle !== null && editingRaffle.contract_raffle_id !== null}
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
                      disabled={editingRaffle !== null && editingRaffle.contract_raffle_id !== null}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (Days)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      required
                      disabled={editingRaffle?.status === 'active' || editingRaffle?.status === 'completed'}
                      placeholder="0.001 = ~90 seconds"
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
                    disabled={editingRaffle !== null && editingRaffle.contract_raffle_id !== null}
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

                <div className="space-y-2">
                  <Label htmlFor="status">Raffle Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md font-rajdhani"
                  >
                    <option value="draft">Draft (Create without activating)</option>
                    <option value="active">Active (Deploy to blockchain immediately)</option>
                  </select>
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    Draft raffles can be activated later from the raffle list
                  </p>
                </div>

                <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
                  <Label className="text-sm font-rajdhani">Network</Label>
                  <p className="text-lg font-orbitron font-bold mt-1">
                    {chainId === 1 ? '🟢 Mainnet' : '🟡 Testnet (Sepolia)'}
                  </p>
                  <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                    Raffle will be deployed to {chainId === 1 ? 'Ethereum Mainnet' : 'Sepolia Testnet'}
                  </p>
                </div>

                {formData.status === 'draft' && (
                  <div className="space-y-2">
                    <Label htmlFor="launch_time">Launch Time (Optional)</Label>
                    <Input
                      id="launch_time"
                      type="datetime-local"
                      value={formData.launch_time}
                      onChange={(e) => setFormData({ ...formData, launch_time: e.target.value })}
                      className="font-rajdhani"
                    />
                    <p className="text-sm text-muted-foreground font-rajdhani">
                      Set a countdown timer for when this raffle will be available
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Position</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    className="font-rajdhani"
                  />
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    Lower numbers appear first on the raffles page
                  </p>
                </div>

                <div className="flex items-center gap-2 p-4 bg-muted/20 rounded-lg border border-border/30">
                  <Switch
                    id="show_on_home"
                    checked={formData.show_on_home}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_on_home: checked })}
                  />
                  <Label htmlFor="show_on_home" className="cursor-pointer font-rajdhani">
                    Show on Home Page
                  </Label>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
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
                disabled={isProcessing || !account}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : editingRaffle ? 'Update Raffle' : 'Create Raffle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
