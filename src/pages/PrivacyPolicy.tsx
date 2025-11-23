import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useWeb3 } from '@/hooks/useWeb3';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const PrivacyPolicy = () => {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('content_value')
          .eq('page', 'legal')
          .eq('content_key', 'privacy_policy')
          .single();

        if (error) throw error;
        setContent(data?.content_value || '');
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);
  
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar 
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        walletAddress={account}
        isConnecting={isConnecting}
      />
      
      <div className="max-w-4xl mx-auto px-4 pt-32 pb-12 relative z-10">
        <h1 className="text-4xl font-bold font-orbitron mb-8">Privacy Policy</h1>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-8 space-y-6 text-foreground">
            <div dangerouslySetInnerHTML={{ __html: content }} />
            
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
