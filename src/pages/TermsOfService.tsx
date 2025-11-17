import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useWeb3 } from '@/hooks/useWeb3';

const TermsOfService = () => {
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
        <h1 className="text-4xl font-bold font-orbitron mb-8">Terms of Service</h1>
        
        <div className="bg-card/80 backdrop-blur-sm rounded-lg p-8 space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using this raffle platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, you should not use this Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years of age to participate in any raffles. By using this Service, you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements. Users are responsible for ensuring that their participation is legal in their jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Blockchain and Smart Contracts</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Service operates on the Ethereum blockchain using smart contracts. All transactions are final and immutable once confirmed on the blockchain. You acknowledge that blockchain transactions cannot be reversed, and you are solely responsible for the security of your wallet and private keys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Raffle Participation</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you purchase raffle tickets:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Ticket purchases are final and non-refundable</li>
              <li>Winners are selected using Chainlink VRF (Verifiable Random Function) to ensure fairness</li>
              <li>You must claim your prize within 30 days of winning notification</li>
              <li>Prizes are awarded as described in each raffle's terms</li>
              <li>We reserve the right to cancel or modify raffles under extraordinary circumstances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Referral Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may earn commission through our referral program. Referral earnings are subject to verification and may be withheld if fraudulent activity is detected. Commission rates and payout terms are subject to change at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Fees and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed in USDT (Tether) on the Ethereum network. You are responsible for any blockchain transaction fees (gas fees). We may charge service fees, which will be clearly displayed before purchase confirmation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to manipulate or exploit the raffle system</li>
              <li>Create multiple accounts to circumvent restrictions</li>
              <li>Engage in fraudulent referral activity</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of this Service are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Disclaimers and Limitations of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Uninterrupted or error-free operation</li>
              <li>The accuracy of information displayed</li>
              <li>Protection against all security vulnerabilities</li>
              <li>The value or deliverability of prizes</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless the Service, its operators, and affiliates from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting a notice on the Service. Your continued use after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">14. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us through the platform's support channels.
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

export default TermsOfService;
