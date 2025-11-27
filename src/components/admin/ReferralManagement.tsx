import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trophy, Plus, Edit, Users, Star, TrendingUp, Copy } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  wallet_address: string | null;
  email: string | null;
  total_points: number;
  tier1_referrals: number;
  tier2_referrals: number;
  tier3_referrals: number;
  total_referrals: number;
  rank: number;
}

interface Quest {
  id: string;
  quest_name: string;
  quest_description: string;
  quest_type: string;
  points_reward: number;
  active: boolean;
  icon: string;
}

export function ReferralManagement() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pointsAdjustment, setPointsAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadLeaderboard(), loadQuests()]);
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    try {
      const { data: pointsData, error: pointsError } = await supabase
        .from('referral_points')
        .select('user_id, points_earned');

      if (pointsError) throw pointsError;

      const { data: referralsData, error: refError } = await supabase
        .from('referrals')
        .select('referrer_id, referral_tier')
        .eq('is_self_referral', false);

      if (refError) throw refError;

      // Get wallet addresses from tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('user_id, wallet_address');

      if (ticketsError) throw ticketsError;

      // Get wallet addresses and emails from support tickets as fallback
      const { data: supportData, error: supportError } = await supabase
        .from('support_tickets')
        .select('user_id, wallet_address');

      if (supportError) console.error('Error fetching support tickets:', supportError);

      // Get emails from profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email');

      if (profilesError) console.error('Error fetching profiles:', profilesError);

      // Map wallet addresses by user_id (take first occurrence)
      const walletsByUser: Record<string, string> = {};
      ticketsData?.forEach(t => {
        if (!walletsByUser[t.user_id] && t.wallet_address) {
          walletsByUser[t.user_id] = t.wallet_address;
        }
      });
      
      // Use support tickets as fallback for wallet addresses
      supportData?.forEach(s => {
        if (!walletsByUser[s.user_id] && s.wallet_address) {
          walletsByUser[s.user_id] = s.wallet_address;
        }
      });

      // Map emails from profiles
      const emailsByUser: Record<string, string> = {};
      profilesData?.forEach(p => {
        if (p.email) {
          emailsByUser[p.id] = p.email;
        }
      });

      // Aggregate points by user
      const pointsByUser: Record<string, number> = {};
      pointsData?.forEach(p => {
        pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + Number(p.points_earned);
      });

      // Aggregate referrals by user and tier
      const referralsByUser: Record<string, { tier1: number; tier2: number; tier3: number }> = {};
      referralsData?.forEach(r => {
        if (!referralsByUser[r.referrer_id]) {
          referralsByUser[r.referrer_id] = { tier1: 0, tier2: 0, tier3: 0 };
        }
        if (r.referral_tier === 1) referralsByUser[r.referrer_id].tier1++;
        else if (r.referral_tier === 2) referralsByUser[r.referrer_id].tier2++;
        else if (r.referral_tier === 3) referralsByUser[r.referrer_id].tier3++;
      });

      // Combine and sort
      const leaderboardData: LeaderboardEntry[] = Object.entries(pointsByUser)
        .map(([user_id, total_points]) => {
          const refs = referralsByUser[user_id] || { tier1: 0, tier2: 0, tier3: 0 };
          return {
            user_id,
            wallet_address: walletsByUser[user_id] || null,
            email: emailsByUser[user_id] || null,
            total_points,
            tier1_referrals: refs.tier1,
            tier2_referrals: refs.tier2,
            tier3_referrals: refs.tier3,
            total_referrals: refs.tier1 + refs.tier2 + refs.tier3,
            rank: 0
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    }
  };

  const loadQuests = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuests(data || []);
    } catch (error) {
      console.error('Error loading quests:', error);
      toast.error('Failed to load quests');
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedUserId || !pointsAdjustment || !adjustmentReason) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const points = parseInt(pointsAdjustment);
      const { error } = await supabase
        .from('referral_points')
        .insert({
          user_id: selectedUserId,
          points_earned: points,
          points_source: 'admin_adjustment',
          reference_id: null
        });

      if (error) throw error;

      toast.success(`Successfully ${points > 0 ? 'added' : 'deducted'} ${Math.abs(points)} points`);
      setIsPointsDialogOpen(false);
      setSelectedUserId('');
      setPointsAdjustment('');
      setAdjustmentReason('');
      loadLeaderboard();
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error('Failed to adjust points');
    }
  };

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    toast.success('User ID copied to clipboard');
  };

  const handleSaveQuest = async (questData: Partial<Quest>) => {
    try {
      if (selectedQuest?.id) {
        // Update existing quest
        const { error } = await supabase
          .from('daily_quests')
          .update(questData)
          .eq('id', selectedQuest.id);

        if (error) throw error;
        toast.success('Quest updated successfully');
      } else {
        // Create new quest
        const { error } = await supabase
          .from('daily_quests')
          .insert(questData as any);

        if (error) throw error;
        toast.success('Quest created successfully');
      }

      setIsEditDialogOpen(false);
      setSelectedQuest(null);
      loadQuests();
    } catch (error) {
      console.error('Error saving quest:', error);
      toast.error('Failed to save quest');
    }
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Section */}
      <Card className="glass-card border-neon-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-neon-gold" />
              <CardTitle className="text-2xl font-orbitron">Referral Leaderboard</CardTitle>
            </div>
            <Dialog open={isPointsDialogOpen} onOpenChange={setIsPointsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-neon-cyan text-neon-cyan">
                  <Star className="w-4 h-4 mr-2" />
                  Adjust Points
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-neon-cyan/30">
                <DialogHeader>
                  <DialogTitle>Manually Adjust User Points</DialogTitle>
                  <DialogDescription>
                    Add or deduct points from a user's balance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>User ID</Label>
                    <Input
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      placeholder="Enter user UUID"
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label>Points (use negative for deduction)</Label>
                    <Input
                      type="number"
                      value={pointsAdjustment}
                      onChange={(e) => setPointsAdjustment(e.target.value)}
                      placeholder="e.g., 100 or -50"
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Reason for adjustment"
                      className="bg-background/50"
                    />
                  </div>
                  <Button onClick={handleAdjustPoints} className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple">
                    Apply Adjustment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>Top performers in the referral program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-neon-cyan">Rank</TableHead>
                  <TableHead className="text-neon-cyan">User ID</TableHead>
                  <TableHead className="text-neon-cyan">Email</TableHead>
                  <TableHead className="text-neon-cyan">Wallet Address</TableHead>
                  <TableHead className="text-neon-cyan text-right">Points</TableHead>
                  <TableHead className="text-neon-cyan text-right">Tier 1</TableHead>
                  <TableHead className="text-neon-cyan text-right">Tier 2</TableHead>
                  <TableHead className="text-neon-cyan text-right">Tier 3</TableHead>
                  <TableHead className="text-neon-cyan text-right">Total Referrals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.slice(0, 50).map((entry) => (
                  <TableRow key={entry.user_id} className="hover:bg-neon-cyan/5">
                    <TableCell className="font-bold">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && `#${entry.rank}`}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <span>{entry.user_id.slice(0, 8)}...</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-neon-cyan/20"
                          onClick={() => copyUserId(entry.user_id)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.email || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.wallet_address ? `${entry.wallet_address.slice(0, 6)}...${entry.wallet_address.slice(-4)}` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-neon-gold">{entry.total_points.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{entry.tier1_referrals}</TableCell>
                    <TableCell className="text-right">{entry.tier2_referrals}</TableCell>
                    <TableCell className="text-right">{entry.tier3_referrals}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.total_referrals}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Daily Quests Management */}
      <Card className="glass-card border-neon-purple/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-neon-purple" />
              <CardTitle className="text-2xl font-orbitron">Daily Quests Management</CardTitle>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setSelectedQuest(null)}
                  className="bg-gradient-to-r from-neon-purple to-neon-pink"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quest
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-neon-purple/30">
                <DialogHeader>
                  <DialogTitle>{selectedQuest ? 'Edit Quest' : 'Create New Quest'}</DialogTitle>
                  <DialogDescription>
                    Configure quest details and rewards
                  </DialogDescription>
                </DialogHeader>
                <QuestForm
                  quest={selectedQuest}
                  onSave={handleSaveQuest}
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setSelectedQuest(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>Create and manage daily quests for users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="p-4 border border-border rounded-lg hover:border-neon-purple/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{quest.icon}</span>
                      <h3 className="font-semibold text-lg">{quest.quest_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${quest.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {quest.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{quest.quest_description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-neon-gold font-semibold">+{quest.points_reward} points</span>
                      <span className="text-muted-foreground">Type: {quest.quest_type}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedQuest(quest);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestForm({ quest, onSave, onCancel }: { quest: Quest | null; onSave: (data: Partial<Quest>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    quest_name: quest?.quest_name || '',
    quest_description: quest?.quest_description || '',
    quest_type: quest?.quest_type || 'social_share',
    points_reward: quest?.points_reward || 50,
    active: quest?.active ?? true,
    icon: quest?.icon || '🎯'
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Quest Name</Label>
        <Input
          value={formData.quest_name}
          onChange={(e) => setFormData({ ...formData, quest_name: e.target.value })}
          placeholder="e.g., Share on Twitter"
          className="bg-background/50"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.quest_description}
          onChange={(e) => setFormData({ ...formData, quest_description: e.target.value })}
          placeholder="Describe what users need to do"
          className="bg-background/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quest Type</Label>
          <Input
            value={formData.quest_type}
            onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
            placeholder="e.g., social_share"
            className="bg-background/50"
          />
        </div>
        <div>
          <Label>Points Reward</Label>
          <Input
            type="number"
            value={formData.points_reward}
            onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) })}
            className="bg-background/50"
          />
        </div>
      </div>
      <div>
        <Label>Icon (Emoji)</Label>
        <Input
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="🎯"
          className="bg-background/50"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.active}
          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
        />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)} className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink">
          Save Quest
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
