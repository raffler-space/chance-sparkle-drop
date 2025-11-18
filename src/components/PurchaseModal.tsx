import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Ticket, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { useWeb3 } from '@/hooks/useWeb3';
import { useUSDTContract } from '@/hooks/useUSDTContract';
import { getNetworkConfig } from '@/config/contracts';
import { ethers } from 'ethers';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: {
    id: number;
    name: string;
    ticketPrice: number;
    maxTickets: number;
    ticketsSold: number;
    contract_raffle_id?: number | null;
  };
  account: string | null;
  onPurchaseSuccess?: () => void;
}

export const PurchaseModal = ({ isOpen, onClose, raffle, account, onPurchaseSuccess }: PurchaseModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [contractTicketPrice, setContractTicketPrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasApproval, setHasApproval] = useState(false);
  
  const { chainId } = useWeb3();
  const { buyTickets, isContractReady, contract } = useRaffleContract(chainId, account);
  const { getBalance, approve, getAllowance, isContractReady: isUSDTReady } = useUSDTContract(chainId, account);

  const ticketPriceInUSDT = contractTicketPrice ? parseFloat(contractTicketPrice) : 0;
  const totalPrice = ticketPriceInUSDT * quantity;
  const availableTickets = raffle.maxTickets - raffle.ticketsSold;
  const hasInsufficientBalance = usdtBalance !== null && parseFloat(usdtBalance) < totalPrice;

  const fetchUSDTBalance = async () => {
    if (!account || !isUSDTReady) return;

    setIsLoadingBalance(true);
    try {
      const balance = await getBalance(account);
      setUsdtBalance(balance);
      console.log('USDT Balance:', balance);
    } catch (error) {
      console.error('Error fetching USDT balance:', error);
      setUsdtBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchContractTicketPrice = async () => {
    console.log('fetchContractTicketPrice called', { 
      hasContract: !!contract, 
      contractRaffleId: raffle.contract_raffle_id,
      raffleId: raffle.id 
    });
    
    if (!contract || (!raffle.contract_raffle_id && raffle.contract_raffle_id !== 0)) {
      console.log('Skipping fetch - missing contract or contract_raffle_id');
      return;
    }

    setIsLoadingPrice(true);
    try {
      console.log('Calling contract.raffles with ID:', raffle.contract_raffle_id);
      const raffleInfo = await contract.raffles(raffle.contract_raffle_id);
      console.log('Raw raffle info from contract:', raffleInfo);
      // USDT uses 6 decimals
      const priceInUSDT = ethers.utils.formatUnits(raffleInfo.ticketPrice, 6);
      setContractTicketPrice(priceInUSDT);
      console.log('Fetched ticket price from contract:', priceInUSDT, 'USDT');
    } catch (error) {
      console.error('Error fetching ticket price from contract:', error);
      setContractTicketPrice(null);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const checkApproval = async () => {
    if (!account || !contract || !isUSDTReady) return;

    try {
      const networkConfig = getNetworkConfig(chainId);
      if (!networkConfig) return;

      const allowance = await getAllowance(account, networkConfig.contracts.raffle);
      const allowanceNum = parseFloat(allowance);
      setHasApproval(allowanceNum >= totalPrice);
    } catch (error) {
      console.error('Error checking approval:', error);
      setHasApproval(false);
    }
  };

  useEffect(() => {
    if (isOpen && account && isUSDTReady) {
      fetchUSDTBalance();
    }
  }, [isOpen, account, isUSDTReady]);

  useEffect(() => {
    if (isOpen && contract && (raffle.contract_raffle_id || raffle.contract_raffle_id === 0)) {
      fetchContractTicketPrice();
    }
  }, [isOpen, contract, raffle.contract_raffle_id]);

  useEffect(() => {
    if (isOpen && contractTicketPrice && account && isUSDTReady) {
      checkApproval();
    }
  }, [isOpen, contractTicketPrice, totalPrice, account, isUSDTReady]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= availableTickets) {
      setQuantity(newQuantity);
    }
  };

  const handleQuickAdd = (amount: number) => {
    const newQuantity = quantity + amount;
    if (newQuantity <= availableTickets) {
      setQuantity(newQuantity);
    }
  };

  const handlePurchase = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isContractReady) {
      toast.error('Contract not ready. Please try again.');
      return;
    }

    if (!raffle.contract_raffle_id && raffle.contract_raffle_id !== 0) {
      toast.error('This raffle is not available for purchase yet.');
      return;
    }

    console.log('=== Ticket Purchase Debug ===');
    console.log('Raffle ID (DB):', raffle.id);
    console.log('Raffle ID (Contract):', raffle.contract_raffle_id);
    console.log('Quantity:', quantity);
    console.log('Account:', account);

    setIsProcessing(true);

    try {
      // Step 1: Check and handle USDT approval
      if (!hasApproval) {
        toast.info('Approving USDT...', {
          description: 'Please confirm the approval transaction',
        });
        
        setIsApproving(true);
        try {
          const networkConfig = getNetworkConfig(chainId);
          if (!networkConfig) throw new Error('Network configuration not found');

          const approveTx = await approve(networkConfig.contracts.raffle, totalPrice.toString());
          await approveTx.wait();
          
          toast.success('USDT approved successfully');
          setHasApproval(true);
          setIsApproving(false);
        } catch (approveError: any) {
          setIsApproving(false);
          if (approveError.code === 4001) {
            toast.error('Approval rejected');
          } else {
            toast.error('Failed to approve USDT');
          }
          return;
        }
      }

      // Step 2: Purchase tickets
      toast.info('Purchasing tickets...', {
        description: 'Please confirm the purchase transaction',
      });

      console.log('Calling buyTickets on contract...');
      const result = await buyTickets(raffle.contract_raffle_id, quantity);
      console.log('BuyTickets result:', result);

      if (!result.success || !result.txHash) {
        toast.error('Failed to purchase tickets');
        return;
      }

      // Update database after successful blockchain transaction (optional for wallet-only users)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Insert ticket records only if user is authenticated
          const ticketRecords = Array.from({ length: quantity }, (_, i) => ({
            user_id: user.id,
            raffle_id: raffle.id,
            tx_hash: result.txHash,
            wallet_address: account,
            ticket_number: raffle.ticketsSold + i + 1,
            quantity: 1,
            purchase_price: raffle.ticketPrice,
          }));

          const { error: ticketsError } = await supabase
            .from('tickets')
            .insert(ticketRecords);

          if (ticketsError) throw ticketsError;

          // Update raffle tickets_sold count
          const { error: updateError } = await supabase
            .from('raffles')
            .update({ tickets_sold: raffle.ticketsSold + quantity })
            .eq('id', raffle.id);

          if (updateError) throw updateError;
          
          console.log('Database updated successfully');
        } else {
          console.log('No authenticated user - purchase recorded only on blockchain');
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't block success - purchase was successful on blockchain
      }

      // Show success message regardless of database update
      toast.success(`Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}!`);
      setQuantity(1);
      onClose();
      onPurchaseSuccess?.();
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.code === 4001) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Failed to process purchase');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-neon-cyan/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-orbitron flex items-center gap-2">
            <Ticket className="text-neon-cyan" />
            Purchase Tickets
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {raffle.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* USDT Balance Display */}
          <div className="glass-card p-3 border-neon-gold/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/70">Your USDT Balance</span>
              <span className="font-rajdhani text-lg text-neon-gold">
                {isLoadingBalance ? (
                  <span className="animate-pulse">Loading...</span>
                ) : usdtBalance !== null ? (
                  `${parseFloat(usdtBalance).toFixed(2)} USDT`
                ) : (
                  'Unable to load'
                )}
              </span>
            </div>
          </div>

          {/* Approval Status */}
          {!hasApproval && contractTicketPrice && (
            <Alert className="border-neon-purple/50 bg-neon-purple/10">
              <AlertTriangle className="h-4 w-4 text-neon-purple" />
              <AlertDescription className="text-foreground/80">
                You need to approve USDT spending before purchasing. This will happen automatically when you click "Confirm Purchase".
              </AlertDescription>
            </Alert>
          )}

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && contractTicketPrice && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Insufficient USDT balance. You need {totalPrice.toFixed(2)} USDT but only have {usdtBalance ? parseFloat(usdtBalance).toFixed(2) : '0'} USDT.
              </AlertDescription>
            </Alert>
          )}

          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="text-sm font-rajdhani text-foreground/80">
              Number of Tickets
            </label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <div className="text-4xl font-orbitron text-neon-cyan glow-text-cyan min-w-[80px] text-center">
                {quantity}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= availableTickets}
                className="border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10"
              >
                <Plus className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(0)}
                disabled={quantity === 0}
                className="border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500"
                title="Reset to 0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick Add Buttons */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickAdd(3)}
                disabled={quantity + 3 > availableTickets}
                className="font-rajdhani"
              >
                +3
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickAdd(5)}
                disabled={quantity + 5 > availableTickets}
                className="font-rajdhani"
              >
                +5
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickAdd(10)}
                disabled={quantity + 10 > availableTickets}
                className="font-rajdhani"
              >
                +10
              </Button>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              {availableTickets} tickets available
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="glass-card p-4 space-y-2 border-neon-purple/30">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Price per ticket</span>
              <span className="font-rajdhani text-neon-gold">
                {isLoadingPrice ? (
                  <span className="animate-pulse">Loading...</span>
                ) : contractTicketPrice !== null ? (
                  `${parseFloat(contractTicketPrice).toFixed(2)} USDT`
                ) : (
                  'Unable to load'
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Quantity</span>
              <span className="font-rajdhani">{quantity}</span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-rajdhani text-lg">Total</span>
                <span className="font-orbitron text-2xl text-neon-cyan glow-text-cyan">
                  {contractTicketPrice !== null ? `${totalPrice.toFixed(2)} USDT` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing || isApproving || !account || hasInsufficientBalance || !contractTicketPrice || isLoadingPrice}
            className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 text-white font-orbitron text-lg h-12 disabled:opacity-50"
          >
            {isProcessing || isApproving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                {isApproving ? 'Approving USDT...' : 'Processing...'}
              </>
            ) : hasApproval ? (
              'Confirm Purchase'
            ) : (
              'Approve & Purchase'
            )}
          </Button>

          {!account && (
            <p className="text-center text-sm text-destructive">
              Please connect your wallet to purchase tickets
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
