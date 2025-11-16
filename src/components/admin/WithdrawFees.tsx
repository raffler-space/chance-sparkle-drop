import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  const handleWithdraw = async () => {
    if (!account || !contract || !isContractReady) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsWithdrawing(true);
    try {
      toast.info('Withdrawing fees...', {
        description: 'Please confirm the transaction in your wallet',
      });

      // Call the withdrawFees function on the raffle contract
      const tx = await contract.withdrawFees();
      toast.info('Transaction submitted, waiting for confirmation...');
      await tx.wait();

      toast.success('Fees withdrawn successfully!');
      fetchBalance();
    } catch (error: any) {
      console.error('Error withdrawing fees:', error);
      toast.error('Failed to withdraw fees', {
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
      <div className="flex items-center justify-between">
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
              Available platform fees
            </p>
          </div>
        </div>

        <Button
          onClick={handleWithdraw}
          disabled={isWithdrawing || parseFloat(contractBalance) === 0}
          className="bg-gradient-to-r from-neon-gold to-neon-cyan hover:opacity-90 font-orbitron"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw Fees'}
        </Button>
      </div>
    </Card>
  );
};
