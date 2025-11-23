import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HowItWorksProps {
  account: string | null;
  isConnecting: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export default function HowItWorks({ account, isConnecting, onConnectWallet, onDisconnectWallet }: HowItWorksProps) {
  const [participationGuide, setParticipationGuide] = useState('');

  useEffect(() => {
    loadParticipationGuide();
  }, []);

  const loadParticipationGuide = async () => {
    const { data } = await supabase
      .from('site_content')
      .select('content_value')
      .eq('content_key', 'how_to_participate_guide')
      .single();
    
    if (data) {
      setParticipationGuide(data.content_value);
    }
  };

  const steps = [
    {
      step: 1,
      icon: '🔗',
      title: 'Connect Wallet',
      desc: 'Link your crypto wallet (MetaMask, Phantom) to participate in our blockchain-powered raffles.'
    },
    {
      step: 2,
      icon: '🎯',
      title: 'Choose Your Prize',
      desc: 'Browse luxury items: supercars, NFTs, real estate, watches. Each with transparent pricing and low-cost entry.'
    },
    {
      step: 3,
      icon: '🎫',
      title: 'Buy Tickets',
      desc: 'Purchase tickets with USDT, ETH, or SOL. You can purchase multiple tickets to increase your chances of winning. Receive NFT proof of entry stored securely in your wallet.'
    },
    {
      step: 4,
      icon: '🎰',
      title: 'Transparent Draw',
      desc: "When target is reached, our smart contract uses Chainlink VRF for provably fair winner selection."
    },
    {
      step: 5,
      icon: '💰',
      title: 'Auto Refunds',
      desc: "If raffle doesn't reach target, smart contract automatically refunds all participants - no questions asked."
    },
    {
      step: 6,
      icon: '🏆',
      title: 'Claim Prize',
      desc: 'Winners use their NFT to prove ownership and coordinate prize delivery worldwide.'
    }
  ];

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Navbar 
        onConnectWallet={onConnectWallet}
        onDisconnectWallet={onDisconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-orbitron font-black text-center mb-16 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            ⚡ HOW IT WORKS
          </h1>
          
          <div className="grid gap-8">
            {steps.map((item) => (
              <div
                key={item.step}
                className="glass-effect p-8 rounded-xl hover:scale-105 transition-transform"
                style={{ animationDelay: `${item.step * 0.1}s` }}
              >
                <div className="text-6xl mb-4">{item.icon}</div>
                <h3 className="font-orbitron text-2xl font-bold text-accent mb-4">
                  {item.step}. {item.title}
                </h3>
                <p className="text-lg leading-relaxed text-foreground/90">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* How To Participate Section */}
          <div className="mt-20">
            <h2 className="text-3xl sm:text-5xl font-orbitron font-black text-center mb-12 bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
              📋 HOW TO PARTICIPATE
            </h2>
            <div className="glass-effect p-8 rounded-xl">
              <div 
                className="prose prose-invert max-w-none text-foreground/90"
                dangerouslySetInnerHTML={{ __html: participationGuide }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
