import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, { message: "Password must be less than 100 characters" })
});

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
      setCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = authSchema.parse({ email, password });
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
      } else {
        // Check for referral code in localStorage
        const referralCode = localStorage.getItem('referralCode');
        if (referralCode && data.user) {
          try {
            const { error: refError } = await supabase.functions.invoke('track-referral', {
              body: {
                referralCode,
                userId: data.user.id
              }
            });

            if (refError) {
              console.error('Failed to track referral:', refError);
            } else {
              // Clear the referral code from localStorage
              localStorage.removeItem('referralCode');
            }
          } catch (refError) {
            console.error('Error tracking referral:', refError);
          }
        }

        toast.success('Account created successfully! You can now sign in.');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = authSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Signed in successfully!');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-dark-900 text-foreground">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-foreground flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <Card className="relative z-10 w-full max-w-md glass-card border-neon-cyan/30">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-orbitron text-center text-neon-cyan glow-text-cyan">
            CryptoRaffle
          </CardTitle>
          <CardDescription className="text-center font-rajdhani text-lg">
            Sign in or create an account to participate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-card border-neon-cyan/30">
              <TabsTrigger 
                value="signin"
                className="font-rajdhani data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="font-rajdhani data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="font-rajdhani">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-card border-neon-cyan/30 focus:border-neon-cyan font-rajdhani"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="font-rajdhani">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-card border-neon-cyan/30 focus:border-neon-cyan font-rajdhani"
                    maxLength={100}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-dark-900 font-rajdhani font-bold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="font-rajdhani">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-card border-neon-cyan/30 focus:border-neon-cyan font-rajdhani"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="font-rajdhani">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="glass-card border-neon-cyan/30 focus:border-neon-cyan font-rajdhani"
                    minLength={6}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground font-rajdhani">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-dark-900 font-rajdhani font-bold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
