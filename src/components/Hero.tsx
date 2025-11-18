import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Hero = () => {
  const [heroFeatures, setHeroFeatures] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchHeroFeatures();
  }, []);

  const fetchHeroFeatures = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('page', 'home')
      .in('content_key', [
        'hero_feature_1_title',
        'hero_feature_1_description',
        'hero_feature_2_title',
        'hero_feature_2_description',
        'hero_feature_3_title',
        'hero_feature_3_description'
      ]);

    if (!error && data) {
      const contentMap = data.reduce((acc, item) => {
        acc[item.content_key] = item.content_value;
        return acc;
      }, {} as Record<string, string>);
      setHeroFeatures(contentMap);
    }
  };
  return (
    <section className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="max-w-5xl mx-auto text-center space-y-8">
        {/* Main Title */}
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-orbitron font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient leading-tight">
            VERIFIED FAIRNESS
          </h1>
          <p className="text-xl sm:text-2xl text-primary/80 font-rajdhani max-w-3xl mx-auto">
            Enter blockchain-powered raffles for Coin lots, NFTs, supercars, real estate, and luxury goods. Transparent, secure, and life-changing.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-secondary to-purple hover:opacity-90 text-white font-orbitron text-lg px-8 py-6 neon-border animate-pulse-glow"
            onClick={() => window.location.href = '/raffles'}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Browse Raffles
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-orbitron text-lg px-8 py-6"
            onClick={() => window.location.href = '/how-it-works'}
          >
            <Shield className="mr-2 h-5 w-5" />
            How It Works
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <div className="glass-effect p-6 rounded-xl space-y-3 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-orbitron font-bold text-lg">
              {heroFeatures.hero_feature_1_title || 'Blockchain Secure'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {heroFeatures.hero_feature_1_description || 'Smart contracts ensure transparent and tamper-proof raffles'}
            </p>
          </div>

          <div className="glass-effect p-6 rounded-xl space-y-3 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-orbitron font-bold text-lg">
              {heroFeatures.hero_feature_2_title || 'Fair & Random'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {heroFeatures.hero_feature_2_description || 'Chainlink VRF ensures provably fair winner selection'}
            </p>
          </div>

          <div className="glass-effect p-6 rounded-xl space-y-3 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-orbitron font-bold text-lg">
              {heroFeatures.hero_feature_3_title || 'Life Changing'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {heroFeatures.hero_feature_3_description || 'Real life changing opportunities for an affordable entry price'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
