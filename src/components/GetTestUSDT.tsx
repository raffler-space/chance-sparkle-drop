import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useUSDTContract } from '@/hooks/useUSDTContract';
import { toast } from 'sonner';

export const GetTestUSDT = () => {
  const [isMinting, setIsMinting] = useState(false);
  const { account, chainId } = useWeb3();
  const { mintTestTokens, isContractReady } = useUSDTContract(chainId, account);

  const handleMintTestUSDT = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsMinting(true);
    try {
      const amount = '1000'; // Mint 1000 test USDT
      toast.info('Minting test USDT...', {
        description: 'Please confirm the transaction in your wallet',
      });

      const tx = await mintTestTokens(amount);
      toast.info('Transaction submitted', {
        description: 'Waiting for confirmation...',
      });

      await tx.wait();
      
      toast.success('Test USDT minted successfully!', {
        description: `${amount} USDT has been added to your wallet`,
      });
    } catch (error: any) {
      console.error('Error minting test USDT:', error);
      toast.error('Failed to mint test USDT', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsMinting(false);
    }
  };

  if (!account || !isContractReady) {
    return null;
  }

  return (
    <Button
      onClick={handleMintTestUSDT}
      disabled={isMinting}
      variant="outline"
      className="gap-2 border-neon-gold/50 hover:border-neon-gold hover:bg-neon-gold/10"
    >
      <Coins className="w-4 h-4" />
      {isMinting ? 'Minting...' : 'Get Test USDT'}
    </Button>
  );
};
