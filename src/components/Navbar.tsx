import { useState } from 'react';
import { Wallet, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onConnectWallet: () => void;
  walletAddress: string | null;
  isConnecting: boolean;
}

export const Navbar = ({ onConnectWallet, walletAddress, isConnecting }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Raffles', href: '#raffles' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'My Entries', href: '#my-entries' },
    { label: 'Winners', href: '#winners' },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-orbitron font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient">
              RAFFLER
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-primary transition-colors font-rajdhani font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Wallet Button */}
          <div className="hidden md:block">
            <Button
              onClick={onConnectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting
                ? 'Connecting...'
                : walletAddress
                ? formatAddress(walletAddress)
                : 'Connect Wallet'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-effect border-t border-border/50">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-base font-rajdhani font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="px-3 py-2">
              <Button
                onClick={() => {
                  onConnectWallet();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
              >
                <Wallet className="mr-2 h-4 w-4" />
                {isConnecting
                  ? 'Connecting...'
                  : walletAddress
                  ? formatAddress(walletAddress)
                  : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
