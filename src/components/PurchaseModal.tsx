import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Ticket, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: {
    id: number;
    name: string;
    ticketPrice: number;
    maxTickets: number;
    ticketsSold: number;
  };
  account: string | null;
}

const USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT on Ethereum mainnet
const RAFFLE_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Replace with deployed contract

export const PurchaseModal = ({ isOpen, onClose, raffle, account }: PurchaseModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const totalPrice = raffle.ticketPrice * quantity;
  const availableTickets = raffle.maxTickets - raffle.ticketsSold;
  const hasInsufficientBalance = usdtBalance !== null && usdtBalance < totalPrice;

  const fetchUSDTBalance = async () => {
    if (!account || !window.ethereum) return;

    setIsLoadingBalance(true);
    try {
      // balanceOf(address) function signature: 0x70a08231
      const data = `0x70a08231000000000000000000000000${account.slice(2)}`;
      
      const balance = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: USDT_CONTRACT_ADDRESS,
          data: data,
        }, 'latest'],
      });

      // USDT uses 6 decimals
      const balanceInUSDT = parseInt(balance, 16) / 1e6;
      setUsdtBalance(balanceInUSDT);
    } catch (error) {
      console.error('Error fetching USDT balance:', error);
      setUsdtBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (isOpen && account) {
      fetchUSDTBalance();
    }
  }, [isOpen, account]);

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

    if (!window.ethereum) {
      toast.error('MetaMask not detected');
      return;
    }

    setIsProcessing(true);

    try {
      // USDT uses 6 decimals
      const amountInSmallestUnit = Math.floor(raffle.ticketPrice * quantity * 1e6);
      const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0');
      
      // Remove '0x' prefix from address and pad to 32 bytes (64 hex chars)
      const recipientAddress = RAFFLE_CONTRACT_ADDRESS.slice(2).padStart(64, '0');
      
      // ERC20 transfer(address,uint256) function signature: 0xa9059cbb
      const data = `0xa9059cbb${recipientAddress}${amountHex}`;
      
      const transferData = window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: USDT_CONTRACT_ADDRESS,
          data: data,
        }],
      });

      toast.promise(transferData, {
        loading: 'Confirming transaction...',
        success: () => {
          setQuantity(1);
          onClose();
          return `Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}!`;
        },
        error: 'Transaction failed. Please try again.',
      });

      await transferData;
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
                  `${usdtBalance.toFixed(2)} USDT`
                ) : (
                  'Unable to load'
                )}
              </span>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Insufficient USDT balance. You need {totalPrice.toFixed(2)} USDT but only have {usdtBalance?.toFixed(2)} USDT.
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
              <span className="font-rajdhani text-neon-gold">{raffle.ticketPrice.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Quantity</span>
              <span className="font-rajdhani">{quantity}</span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-rajdhani text-lg">Total</span>
                <span className="font-orbitron text-2xl text-neon-cyan glow-text-cyan">
                  {totalPrice.toFixed(2)} USDT
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing || !account || hasInsufficientBalance}
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
