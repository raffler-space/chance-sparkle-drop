import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Ticket, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { useWeb3 } from '@/hooks/useWeb3';
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
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [contractTicketPrice, setContractTicketPrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  const { chainId } = useWeb3();
  const { buyTickets, isContractReady, contract } = useRaffleContract(chainId, account);

  const ticketPriceInEth = contractTicketPrice ? parseFloat(contractTicketPrice) : 0;
  const totalPrice = ticketPriceInEth * quantity;
  const availableTickets = raffle.maxTickets - raffle.ticketsSold;
  const hasInsufficientBalance = ethBalance !== null && parseFloat(ethBalance) < totalPrice;

  const fetchETHBalance = async () => {
    if (!account || !window.ethereum) return;

    setIsLoadingBalance(true);
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      });

      const balanceInETH = ethers.utils.formatEther(balance);
      setEthBalance(balanceInETH);
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      setEthBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchContractTicketPrice = async () => {
    if (!contract || !raffle.contract_raffle_id && raffle.contract_raffle_id !== 0) return;

    setIsLoadingPrice(true);
    try {
      const raffleInfo = await contract.raffles(raffle.contract_raffle_id);
      const priceInEth = ethers.utils.formatEther(raffleInfo.ticketPrice);
      setContractTicketPrice(priceInEth);
      console.log('Fetched ticket price from contract:', priceInEth, 'ETH');
    } catch (error) {
      console.error('Error fetching ticket price from contract:', error);
      setContractTicketPrice(null);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  useEffect(() => {
    if (isOpen && account) {
      fetchETHBalance();
    }
  }, [isOpen, account]);

  useEffect(() => {
    if (isOpen && contract && (raffle.contract_raffle_id || raffle.contract_raffle_id === 0)) {
      fetchContractTicketPrice();
    }
  }, [isOpen, contract, raffle.contract_raffle_id]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= availableTickets) {
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
      // Call buyTickets on the smart contract
      console.log('Calling buyTickets on contract...');
      const result = await buyTickets(raffle.contract_raffle_id, quantity);
      console.log('BuyTickets result:', result);

      if (!result.success || !result.txHash) {
        toast.error('Failed to purchase tickets');
        return;
      }

      // Update database after successful blockchain transaction
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error('Please sign in to complete purchase');
          return;
        }

        // Insert ticket records
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

        toast.success(`Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}!`);
        setQuantity(1);
        onClose();
        onPurchaseSuccess?.();
      } catch (dbError) {
        console.error('Database update error:', dbError);
        toast.error('Transaction succeeded but failed to update records. Please contact support.');
      }
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
          {/* ETH Balance Display */}
          <div className="glass-card p-3 border-neon-gold/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/70">Your ETH Balance</span>
              <span className="font-rajdhani text-lg text-neon-gold">
                {isLoadingBalance ? (
                  <span className="animate-pulse">Loading...</span>
                ) : ethBalance !== null ? (
                  `${parseFloat(ethBalance).toFixed(4)} ETH`
                ) : (
                  'Unable to load'
                )}
              </span>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && contractTicketPrice && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Insufficient ETH balance. You need {totalPrice.toFixed(4)} ETH but only have {ethBalance ? parseFloat(ethBalance).toFixed(4) : '0'} ETH.
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
                  `${parseFloat(contractTicketPrice).toFixed(4)} ETH`
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
                  {contractTicketPrice !== null ? `${totalPrice.toFixed(4)} ETH` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing || !account || hasInsufficientBalance || !contractTicketPrice || isLoadingPrice}
            className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 text-white font-orbitron text-lg h-12 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Ticket className="mr-2" />
                Confirm Purchase
              </>
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
