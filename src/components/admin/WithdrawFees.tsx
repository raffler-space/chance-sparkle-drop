import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Loader2, DollarSign } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useRaffleContract } from '@/hooks/useRaffleContract';
import { useUSDTContract } from '@/hooks/useUSDTContract';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/config/contracts';

export const WithdrawFees = () => {
  const { account, chainId } = useWeb3();
  const { contract, isContractReady } = useRaffleContract(chainId, account);
  const { getBalance } = useUSDTContract(chainId, account);
  const [contractBalance, setContractBalance] = useState('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (contract && isContractReady) {
      fetchBalance();
    }
  }, [contract, isContractReady]);

  const fetchBalance = async () => {
    if (!contract || !isContractReady || !chainId) return;
    
    try {
      const network = getNetworkConfig(chainId);
      if (!network) {
        setLoading(false);
        return;
      }

      // Get the raffle contract address to check its USDT balance
      const raffleContractAddress = network.contracts.raffle;
      const balance = await getBalance(raffleContractAddress);
      setContractBalance(balance);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setContractBalance('0');
      setLoading(false);
    }
  };

  const handleWithdraw = async (withdrawAll: boolean) => {
    if (!account || !contract || !isContractReady) {
      toast.error('Please connect your wallet');
      return;
    }

    let amountToWithdraw = '0';
    
    if (!withdrawAll) {
      if (!customAmount || parseFloat(customAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      if (parseFloat(customAmount) > parseFloat(contractBalance)) {
        toast.error('Amount exceeds contract balance');
        return;
      }
      amountToWithdraw = customAmount;
    }

    setIsWithdrawing(true);
    try {
      toast.info(withdrawAll ? 'Withdrawing all funds...' : `Withdrawing ${customAmount} USDT...`, {
        description: 'Please confirm the transaction in your wallet',
      });

      // Convert amount to wei (USDT has 6 decimals)
      const amountInWei = withdrawAll ? '0' : ethers.utils.parseUnits(amountToWithdraw, 6).toString();
      
      const tx = await contract.withdrawFees(amountInWei);
      toast.info('Transaction submitted, waiting for confirmation...');
      await tx.wait();

      toast.success('Funds withdrawn successfully!');
      setCustomAmount('');
      fetchBalance();
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to withdraw funds', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isContractReady || loading) {
    return (
      <Card className="glass-card border-neon-gold/30 p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-neon-gold/30 p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-neon-gold/20 to-neon-cyan/20 p-4 rounded-full">
            <DollarSign className="w-8 h-8 text-neon-gold" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-xl text-neon-gold mb-1">
              Contract Balance
            </h3>
            <p className="text-3xl font-orbitron font-bold text-foreground">
              {contractBalance} USDT
            </p>
            <p className="text-sm text-muted-foreground font-rajdhani">
              Total funds in contract
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="number"
              placeholder="Enter amount to withdraw"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={isWithdrawing || parseFloat(contractBalance) === 0}
              className="flex-1 font-rajdhani"
              step="0.000001"
              min="0"
              max={contractBalance}
            />
            <Button
              onClick={() => handleWithdraw(false)}
              disabled={isWithdrawing || !customAmount || parseFloat(contractBalance) === 0}
              variant="outline"
              className="font-orbitron border-neon-gold/50 hover:bg-neon-gold/10"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Amount
            </Button>
          </div>

          <Button
            onClick={() => handleWithdraw(true)}
            disabled={isWithdrawing || parseFloat(contractBalance) === 0}
            className="w-full bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90 font-orbitron"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw All Funds'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
