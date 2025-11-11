import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Menu, X, LayoutDashboard, Shield, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface NavbarProps {
  onConnectWallet: () => void;
  walletAddress: string | null;
  isConnecting: boolean;
}

export const Navbar = ({ onConnectWallet, walletAddress, isConnecting }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check current auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const navLinks = [
    { label: 'Home', href: '/', type: 'link' },
    { label: 'Dashboard', href: '/dashboard', type: 'link', icon: LayoutDashboard },
    { label: 'Admin', href: '/admin', type: 'link', icon: Shield },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-2xl font-orbitron font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient">
              RAFFLER
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-rajdhani font-medium"
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth and Wallet Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground font-rajdhani">
                  {user.email}
                </span>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-neon-cyan/30 hover:bg-neon-cyan/10 font-rajdhani"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = '/auth'}
                variant="outline"
                size="sm"
                className="border-neon-cyan/30 hover:bg-neon-cyan/10 font-rajdhani"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
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
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-2 px-3 py-2 text-base font-rajdhani font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
            <div className="px-3 py-2 space-y-2">
              {user ? (
                <>
                  <div className="text-sm text-muted-foreground font-rajdhani px-3">
                    {user.email}
                  </div>
                  <Button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full border-neon-cyan/30 hover:bg-neon-cyan/10 font-rajdhani"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    window.location.href = '/auth';
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-neon-cyan/30 hover:bg-neon-cyan/10 font-rajdhani"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
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
