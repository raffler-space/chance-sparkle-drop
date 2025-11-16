import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Menu, X, LayoutDashboard, Shield, LogIn, LogOut, UserCircle, Gift, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onConnectWallet: () => void;
  walletAddress: string | null;
  isConnecting: boolean;
}

export const Navbar = ({ onConnectWallet, walletAddress, isConnecting }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const handleEmailLogin = () => {
    navigate('/auth');
  };

  const allNavLinks = [
    { label: 'Home', href: '/', type: 'link' },
    { label: 'Raffles', href: '/raffles', type: 'link' },
    { label: 'How It Works', href: '/how-it-works', type: 'link' },
    { label: 'Admin', href: '/admin', type: 'link', icon: Shield, adminOnly: true },
  ];

  const navLinks = allNavLinks.filter(link => !link.adminOnly || isAdmin);

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

          {/* Wallet/User Menu - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!walletAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={isConnecting}
                    className="bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-effect border-border/50">
                  <DropdownMenuItem onClick={onConnectWallet} className="cursor-pointer font-rajdhani">
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleEmailLogin} className="cursor-pointer font-rajdhani">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Login
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron">
                    <Wallet className="mr-2 h-4 w-4" />
                    {formatAddress(walletAddress)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-effect border-border/50">
                  <DropdownMenuLabel className="font-rajdhani">
                    {formatAddress(walletAddress)}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer font-rajdhani">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/referrals" className="cursor-pointer font-rajdhani">
                      <Gift className="mr-2 h-4 w-4" />
                      Referrals
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleEmailLogin} className="cursor-pointer font-rajdhani">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Login
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
              {!walletAddress ? (
                <>
                  <Button
                    onClick={() => {
                      onConnectWallet();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isConnecting}
                    className="w-full bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                  <Button
                    onClick={() => {
                      handleEmailLogin();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full font-orbitron"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email Login
                  </Button>
                </>
              ) : user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-3 py-2 text-base font-rajdhani font-medium text-muted-foreground hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/referrals"
                    className="flex items-center px-3 py-2 text-base font-rajdhani font-medium text-muted-foreground hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Referrals
                  </Link>
                  <Button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full font-orbitron text-destructive hover:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    handleEmailLogin();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full font-orbitron"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Email Login
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
