import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useWeb3 } from '@/hooks/useWeb3';

const PrivacyPolicy = () => {
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
        <h1 className="text-4xl font-bold font-orbitron mb-8">Privacy Policy</h1>
        
        <div className="bg-card/80 backdrop-blur-sm rounded-lg p-8 space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Wallet Address:</strong> Your Ethereum wallet address is collected when you connect your wallet</li>
              <li><strong>Transaction Data:</strong> Blockchain transactions, including ticket purchases and prize claims</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our Service, including pages visited and features used</li>
              <li><strong>Referral Information:</strong> Referral codes and earning records if you participate in the referral program</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use collected information for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Processing raffle ticket purchases and prize distributions</li>
              <li>Managing your account and providing customer support</li>
              <li>Processing referral commissions and rewards</li>
              <li>Detecting and preventing fraud and abuse</li>
              <li>Improving our Service and developing new features</li>
              <li>Communicating important updates about raffles and wins</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Blockchain and Data Transparency</h2>
            <p className="text-muted-foreground leading-relaxed">
              All raffle transactions are recorded on the Ethereum blockchain, which is public and permanent. Your wallet address and transaction history are publicly visible on blockchain explorers. We cannot control or delete blockchain data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, analytics, customer support)</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or sale of assets</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement reasonable security measures to protect your information. However, no method of transmission over the internet is 100% secure. You are responsible for maintaining the security of your wallet and private keys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance user experience, analyze usage patterns, and remember your preferences. You can control cookie settings through your browser, though some features may not function properly if disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service integrates with third-party services including wallet providers (MetaMask, WalletConnect), blockchain networks (Ethereum), and oracle services (Chainlink). These services have their own privacy policies which govern their use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal and operational limitations)</li>
              <li>Object to processing of your information</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Note: We cannot delete information stored on the blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide the Service and comply with legal obligations. Blockchain data is permanent and cannot be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for individuals under 18 years of age. We do not knowingly collect information from children. If we discover we have collected information from a child, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Service, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service with a new "Last Updated" date. Your continued use constitutes acceptance of the changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us through the platform's support channels.
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

export default PrivacyPolicy;
