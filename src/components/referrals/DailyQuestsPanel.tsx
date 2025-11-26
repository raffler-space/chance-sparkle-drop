import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Quest {
  id: string;
  quest_name: string;
  quest_description: string;
  quest_type: string;
  points_reward: number;
  icon: string;
}

interface DailyQuestsPanelProps {
  quests: Quest[];
  completedToday: Set<string>;
  onQuestComplete: () => void;
  referralLink: string;
}

export function DailyQuestsPanel({ quests, completedToday, onQuestComplete, referralLink }: DailyQuestsPanelProps) {
  const [completing, setCompleting] = useState<string | null>(null);

  const shareToSocial = async (quest: Quest) => {
    const text = encodeURIComponent("Join me on Raffler and win luxury prizes! Use my referral link:");
    const url = encodeURIComponent(referralLink);
    
    const socialUrls: Record<string, string> = {
      share_twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      share_telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      share_facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      share_whatsapp: `https://wa.me/?text=${text}%20${url}`
    };

    if (socialUrls[quest.quest_type]) {
      window.open(socialUrls[quest.quest_type], '_blank');
      
      // Mark quest as complete
      setCompleting(quest.id);
      try {
        const { error } = await supabase
          .from('user_quest_completions')
          .insert({
            quest_id: quest.id,
            completed_date: new Date().toISOString().split('T')[0]
          } as any);

        if (error) throw error;

        toast({
          title: "Quest Complete! 🎉",
          description: `You earned ${quest.points_reward} points!`,
        });
        
        onQuestComplete();
      } catch (error) {
        console.error('Error completing quest:', error);
        toast({
          title: "Already completed",
          description: "You've already completed this quest today!",
          variant: "destructive",
        });
      } finally {
        setCompleting(null);
      }
    }
  };

  return (
    <div className="glass-effect p-6 rounded-xl space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-orbitron font-bold text-accent">
          🎯 Daily Quests
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Complete daily challenges to earn bonus points!
        </p>
      </div>

      <div className="grid gap-3">
        {quests.map((quest) => {
          const isCompleted = completedToday.has(quest.id);
          return (
            <div
              key={quest.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                isCompleted
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-background/30 border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{quest.icon}</span>
                <div>
                  <div className="font-semibold">{quest.quest_name}</div>
                  <div className="text-sm text-muted-foreground">{quest.quest_description}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-primary font-bold">+{quest.points_reward}</span>
                {isCompleted ? (
                  <div className="flex items-center gap-1 text-primary">
                    <Check className="w-5 h-5" />
                    <span className="text-sm">Done</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => shareToSocial(quest)}
                    disabled={completing === quest.id}
                    size="sm"
                    className="bg-gradient-to-r from-secondary to-purple hover:opacity-90"
                  >
                    Share
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
