import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AlertTriangle } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';

const Disclaimer = () => {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar 
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <AlertTriangle className="w-10 h-10 text-warning" />
          <h1 className="text-4xl font-bold font-orbitron">Legal Disclaimer</h1>
        </div>
        
        <div className="bg-card/80 backdrop-blur-sm rounded-lg p-8 space-y-6 text-foreground">
          <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6">
            <p className="text-warning-foreground font-semibold">
              IMPORTANT: Please read this disclaimer carefully before using this platform.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-3">No Investment Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nothing on this platform constitutes financial, investment, legal, or tax advice. You should consult with appropriate professionals before making any decisions related to cryptocurrencies or blockchain-based services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Gambling and Risk</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Participation in raffles involves risk and should be considered a form of entertainment, not investment. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You may lose the entire amount paid for raffle tickets</li>
              <li>Winning is based on chance and cannot be guaranteed</li>
              <li>Past results do not indicate future outcomes</li>
              <li>You should only spend what you can afford to lose</li>
              <li>Gambling can be addictive - seek help if needed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Blockchain and Cryptocurrency Risks</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Using blockchain technology and cryptocurrencies involves significant risks:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Irreversible Transactions:</strong> Blockchain transactions cannot be reversed or canceled</li>
              <li><strong>Volatility:</strong> Cryptocurrency values can fluctuate significantly</li>
              <li><strong>Security:</strong> You are solely responsible for securing your wallet and private keys</li>
              <li><strong>Technical Risk:</strong> Smart contracts may contain bugs or vulnerabilities</li>
              <li><strong>Network Risk:</strong> Blockchain networks may experience congestion or downtime</li>
              <li><strong>Regulatory Risk:</strong> Laws regarding cryptocurrencies are evolving and uncertain</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">No Warranty</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED. We disclaim all warranties including but not limited to merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the platform will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-3">
              <li>Loss of funds or cryptocurrency</li>
              <li>Loss of profits or opportunity</li>
              <li>Technical failures or security breaches</li>
              <li>Smart contract vulnerabilities or exploits</li>
              <li>Regulatory actions or changes in law</li>
              <li>Actions of third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Jurisdiction and Legal Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for ensuring that your use of this platform complies with all applicable laws in your jurisdiction. The legal status of online raffles and cryptocurrencies varies by location. Some jurisdictions may prohibit or restrict these activities. By using this platform, you represent that your participation is legal in your location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Smart Contract Risks</h2>
            <p className="text-muted-foreground leading-relaxed">
              The raffles operate through smart contracts deployed on the Ethereum blockchain. While we strive for security and reliability, smart contracts may contain unknown vulnerabilities. We are not responsible for losses resulting from smart contract bugs, exploits, or unexpected behavior.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              This platform integrates with third-party services including wallet providers, blockchain networks, and oracle services. We are not responsible for the functionality, security, or availability of these third-party services. Your use of third-party services is subject to their own terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Prize Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we make reasonable efforts to deliver prizes as described, we do not guarantee the quality, condition, authenticity, or value of prizes. Prizes may be subject to additional terms, restrictions, or requirements. Some prizes may require winners to cover taxes, shipping, or other costs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Forward-Looking Statements</h2>
            <p className="text-muted-foreground leading-relaxed">
              Any statements about future features, roadmaps, or developments are forward-looking and should not be relied upon. Actual results may differ materially from any forward-looking statements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Responsible Gambling</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you believe you have a gambling problem, please seek help:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>National Council on Problem Gambling: 1-800-522-4700</li>
              <li>Gamblers Anonymous: www.gamblersanonymous.org</li>
              <li>Set personal limits and stick to them</li>
              <li>Never gamble with money you cannot afford to lose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Acknowledgment</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using this platform, you acknowledge that you have read, understood, and agree to this disclaimer. You accept all risks associated with blockchain technology, cryptocurrencies, and online raffles. You agree to hold harmless the platform, its operators, and affiliates from any claims or damages.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
