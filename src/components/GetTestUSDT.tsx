import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleMintTestUSDT}
            disabled={isMinting}
            variant="outline"
            className="gap-2 border-neon-gold/50 hover:border-neon-gold hover:bg-neon-gold/10"
          >
            <Coins className="w-4 h-4" />
            {isMinting ? 'Minting...' : 'Get Test USDT'}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-semibold">Instructions For Joining The Test:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Switch to Sepolia network before connecting wallet.</li>
              <li>Get Sepolia ETH here: <a href="https://shorturl.at/hMsxo" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://shorturl.at/hMsxo</a></li>
              <li>Hop into your Dashboard and click on "Get Test USDT"</li>
              <li>Add mock USDT as a token - *OPTIONAL</li>
              <li>Buy Tickets (confirm spend→confirm purchase) and wait for results.</li>
            </ol>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
