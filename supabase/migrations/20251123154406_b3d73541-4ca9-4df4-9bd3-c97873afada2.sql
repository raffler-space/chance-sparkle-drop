-- Add How To Participate guide content to site_content table
INSERT INTO public.site_content (content_key, content_value, description, page)
VALUES (
  'how_to_participate_guide',
  '<div class="space-y-8">
    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 1: Get a Crypto Wallet</h3>
      <p class="mb-4">A crypto wallet is your gateway to participating in blockchain raffles. We recommend:</p>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>MetaMask</strong> (Desktop & Mobile) - Most popular, beginner-friendly
          <ul class="list-circle pl-6 mt-2">
            <li>Visit <a href="https://metamask.io" target="_blank" class="text-primary hover:underline">metamask.io</a></li>
            <li>Download the browser extension (Chrome, Firefox, Brave) or mobile app (iOS/Android)</li>
            <li>Click "Create a Wallet" and follow the setup</li>
            <li>CRITICAL: Write down your 12-word recovery phrase on paper and store it safely offline</li>
            <li>Never share your recovery phrase with anyone</li>
          </ul>
        </li>
        <li><strong>Phantom</strong> (Alternative option) - Great for Solana support</li>
        <li><strong>Trust Wallet</strong> (Mobile-first) - Good for beginners on mobile</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 2: Fund Your Wallet</h3>
      <p class="mb-4">You need two types of tokens to participate:</p>
      <ul class="list-disc pl-6 space-y-3">
        <li><strong>USDT (Tether)</strong> - To purchase raffle tickets
          <ul class="list-circle pl-6 mt-2">
            <li>Buy USDT on exchanges like Coinbase, Binance, or Kraken</li>
            <li>Or use MetaMask''s built-in "Buy" feature with credit/debit card</li>
            <li>Withdraw to your wallet address (make sure to use the Ethereum network)</li>
          </ul>
        </li>
        <li><strong>ETH (Ethereum)</strong> - For transaction fees (gas)
          <ul class="list-circle pl-6 mt-2">
            <li>You need a small amount (~$10-20) for gas fees</li>
            <li>Purchase through the same method as USDT</li>
            <li>Gas fees are required for every transaction on Ethereum</li>
          </ul>
        </li>
      </ul>
      <p class="mt-4 text-sm italic">💡 Tip: Start with $50 USDT + $20 ETH for gas to have enough for multiple entries</p>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 3: Connect Your Wallet</h3>
      <p class="mb-4"><strong>On Desktop:</strong></p>
      <ul class="list-disc pl-6 space-y-2 mb-4">
        <li>Click the "Connect Wallet" button in the top right corner</li>
        <li>Select your wallet (MetaMask, Phantom, etc.)</li>
        <li>A popup will appear asking for permission</li>
        <li>Click "Connect" to authorize</li>
        <li>You''re now connected! Your wallet address will show in the navbar</li>
      </ul>
      <p class="mb-4"><strong>On Mobile:</strong></p>
      <ul class="list-disc pl-6 space-y-2">
        <li>Open your wallet app (MetaMask/Phantom)</li>
        <li>Tap the browser tab within the app</li>
        <li>Navigate to our website</li>
        <li>Tap "Connect Wallet" and approve the connection</li>
        <li>Alternative: Use your phone''s browser and the wallet will auto-connect</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 4: Browse & Select a Raffle</h3>
      <ul class="list-disc pl-6 space-y-2">
        <li>Visit the "Raffles" page to see all active raffles</li>
        <li>Click on any raffle to view full details</li>
        <li>Check the prize, ticket price, end date, and tickets sold</li>
        <li>Review the prize images and description</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 5: Purchase Tickets</h3>
      <p class="mb-4">Once you''ve chosen a raffle:</p>
      <ol class="list-decimal pl-6 space-y-3">
        <li><strong>Click "Purchase Tickets"</strong> button on the raffle detail page</li>
        <li><strong>Choose quantity</strong> - More tickets = better odds of winning!</li>
        <li><strong>First Transaction: Approve USDT Spending</strong>
          <ul class="list-circle pl-6 mt-2">
            <li>Your wallet will prompt you to approve spending USDT</li>
            <li>This is a one-time approval per raffle contract</li>
            <li>Click "Confirm" in your wallet popup</li>
            <li>Wait for confirmation (~30 seconds)</li>
            <li>You''ll pay a small gas fee in ETH</li>
          </ul>
        </li>
        <li><strong>Second Transaction: Buy Tickets</strong>
          <ul class="list-circle pl-6 mt-2">
            <li>After approval, you''ll be prompted to confirm the ticket purchase</li>
            <li>Review the USDT amount + gas fee</li>
            <li>Click "Confirm" in your wallet</li>
            <li>Wait for blockchain confirmation</li>
          </ul>
        </li>
        <li><strong>Success!</strong> Your tickets are now recorded on the blockchain</li>
      </ol>
      <p class="mt-4 text-sm italic">⚠️ Important: Never close the purchase modal until both transactions are complete</p>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 6: Track Your Entries</h3>
      <ul class="list-disc pl-6 space-y-2">
        <li>Go to your <strong>Dashboard</strong> (click "Dashboard" in the navbar)</li>
        <li>View all your ticket purchases under "My Tickets"</li>
        <li>See transaction history and confirmations</li>
        <li>Check which raffles you''re entered in</li>
        <li>Monitor raffle progress and draw dates</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 7: Winner Selection & Notification</h3>
      <ul class="list-disc pl-6 space-y-2">
        <li>When the raffle reaches its target or end date, a winner is selected</li>
        <li>We use <strong>Chainlink VRF</strong> for provably fair random selection</li>
        <li>If you win, you''ll receive notifications via email and on your dashboard</li>
        <li>The winner is recorded permanently on the blockchain</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">Step 8: Claim Your Prize</h3>
      <p class="mb-4">Congratulations, winner! Here''s how to claim:</p>
      <ol class="list-decimal pl-6 space-y-3">
        <li>Check your Dashboard for a "Claim Prize" notification</li>
        <li>Click the "Claim Reward" button</li>
        <li>Fill in your delivery information:
          <ul class="list-circle pl-6 mt-2">
            <li>Full name</li>
            <li>Shipping address</li>
            <li>Phone number</li>
            <li>Any special delivery instructions</li>
          </ul>
        </li>
        <li>Submit the form - our team will review within 24 hours</li>
        <li>We''ll contact you to coordinate prize delivery</li>
        <li>For large prizes (cars, property), legal documentation will be handled professionally</li>
      </ol>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">🔒 Security Tips</h3>
      <ul class="list-disc pl-6 space-y-2">
        <li>Never share your wallet recovery phrase or private key</li>
        <li>Always verify you''re on the correct website URL</li>
        <li>Double-check transaction details before confirming</li>
        <li>Keep your wallet app updated</li>
        <li>Use strong passwords and enable 2FA where available</li>
        <li>Be cautious of phishing attempts via email or social media</li>
      </ul>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-accent mb-4">❓ Need Help?</h3>
      <p>If you encounter any issues:</p>
      <ul class="list-disc pl-6 space-y-2 mt-2">
        <li>Check our FAQ section</li>
        <li>Contact support through the dashboard</li>
        <li>Join our community Discord for peer support</li>
        <li>Email us directly for urgent matters</li>
      </ul>
    </div>
  </div>',
  'Complete step-by-step guide for participating in raffles from wallet setup to prize claiming',
  'how-it-works'
) ON CONFLICT (content_key) DO NOTHING;