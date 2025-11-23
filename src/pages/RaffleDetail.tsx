import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Ticket, Image as ImageIcon, Info, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseModal } from "@/components/PurchaseModal";
import LiveTicketFeed from "@/components/LiveTicketFeed";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useWeb3 } from "@/hooks/useWeb3";
import { useRaffleContract } from "@/hooks/useRaffleContract";

interface Raffle {
  id: number;
  name: string;
  description: string;
  detailed_description: string;
  prize_description: string;
  rules: string;
  ticket_price: number;
  max_tickets: number;
  tickets_sold: number;
  image_url: string;
  gallery_images: string[];
  status: string;
  draw_date: string;
  launch_time: string;
  contract_raffle_id: number;
  nft_collection_address: string;
  winner_address: string;
  draw_tx_hash: string;
  additional_info: any;
  network: string;
  duration_days: number;
}

const RaffleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, connectWallet, chainId } = useWeb3();
  const { getRaffleInfo } = useRaffleContract(chainId, account || undefined);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [onChainTicketsSold, setOnChainTicketsSold] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    loadRaffle();
  }, [id]);

  useEffect(() => {
    if (raffle?.contract_raffle_id !== null && raffle?.contract_raffle_id !== undefined) {
      loadOnChainData();
    }
  }, [raffle?.contract_raffle_id]);

  const getCalculatedDrawDate = () => {
    if (!raffle) return null;
    
    // For upcoming raffles, calculate draw date from launch_time + duration_days
    if (raffle.launch_time && new Date(raffle.launch_time) > new Date() && raffle.duration_days) {
      const launchDate = new Date(raffle.launch_time);
      const drawDate = new Date(launchDate);
      drawDate.setDate(drawDate.getDate() + raffle.duration_days);
      return drawDate.toISOString();
    }
    
    // Otherwise use the stored draw_date
    return raffle.draw_date;
  };

  useEffect(() => {
    const drawDate = getCalculatedDrawDate();
    if (!drawDate) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const drawDateTime = new Date(drawDate).getTime();
      const difference = drawDateTime - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [raffle?.draw_date, raffle?.launch_time, raffle?.duration_days]);

  const loadOnChainData = async () => {
    if (!raffle?.contract_raffle_id) return;
    
    try {
      const details = await getRaffleInfo(raffle.contract_raffle_id);
      if (details) {
        setOnChainTicketsSold(details.ticketsSold);
      }
    } catch (error) {
      console.error("Error loading on-chain data:", error);
    }
  };

  const loadRaffle = async () => {
    if (!id) {
      navigate("/raffles");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("raffles")
        .select("*")
        .eq("id", parseInt(id))
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Not Found",
          description: "This raffle does not exist",
          variant: "destructive",
        });
        navigate("/raffles");
        return;
      }

      setRaffle(data);
      setSelectedImage(data.image_url || "");
    } catch (error) {
      console.error("Error loading raffle:", error);
      toast({
        title: "Error",
        description: "Failed to load raffle details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!raffle) return null;
    
    if (raffle.launch_time && new Date(raffle.launch_time) > new Date()) {
      return <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">📅 UPCOMING</Badge>;
    }
    if (raffle.status === 'completed') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ COMPLETED</Badge>;
    }
    if (raffle.tickets_sold >= raffle.max_tickets) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🔥 SOLD OUT</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 LIVE</Badge>;
  };

  const calculateProgress = () => {
    if (!raffle) return 0;
    const ticketsSold = onChainTicketsSold !== null ? onChainTicketsSold : raffle.tickets_sold;
    return (ticketsSold / raffle.max_tickets) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!raffle) {
    return null;
  }

  const isUpcoming = raffle.launch_time && new Date(raffle.launch_time) > new Date();

  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/raffles")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Raffles
        </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative aspect-square bg-background/5">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={raffle.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-20 h-20 text-muted-foreground" />
                </div>
              )}
            </div>
          </Card>

          {/* Gallery */}
          {raffle.gallery_images && raffle.gallery_images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedImage(raffle.image_url || "")}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === raffle.image_url ? "border-primary" : "border-border"
                }`}
              >
                <img
                  src={raffle.image_url || ""}
                  alt="Main"
                  className="w-full h-full object-cover"
                />
              </button>
              {raffle.gallery_images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === img ? "border-primary" : "border-border"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-4xl font-bold text-foreground">{raffle.name}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-xl text-primary font-semibold">{raffle.prize_description}</p>
            {raffle.description && (
              <p className="text-muted-foreground mt-4">{raffle.description}</p>
            )}
          </div>

          {/* Ticket Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ticket Price</span>
                <span className="text-2xl font-bold text-primary">{raffle.ticket_price} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tickets Sold</span>
                <span className="text-lg font-semibold">
                  {onChainTicketsSold !== null ? onChainTicketsSold : raffle.tickets_sold} / {raffle.max_tickets}
                </span>
              </div>
              <div className="w-full bg-background/50 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
              {getCalculatedDrawDate() && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Draw Date: {new Date(getCalculatedDrawDate()!).toLocaleDateString()}</span>
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center gap-1 font-mono text-primary font-semibold">
                      <span>{timeRemaining.days}d</span>
                      <span>:</span>
                      <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
                      <span>:</span>
                      <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                      <span>:</span>
                      <span>{String(timeRemaining.seconds).padStart(2, '0')}s</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => account ? setIsPurchaseModalOpen(true) : connectWallet()}
            disabled={isUpcoming || raffle.tickets_sold >= raffle.max_tickets}
            size="lg"
            className="w-full"
          >
            <Ticket className="w-5 h-5 mr-2" />
            {!account ? "Connect Wallet" : isUpcoming ? "Coming Soon" : raffle.tickets_sold >= raffle.max_tickets ? "Sold Out" : "Enter Raffle"}
          </Button>

          {/* Onchain Info */}
          {raffle.contract_raffle_id && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <h3 className="font-semibold text-foreground mb-2">Onchain Information</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract Raffle ID:</span>
                    <span className="font-mono">{raffle.contract_raffle_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NFT Collection:</span>
                    <span className="font-mono text-xs break-all">{raffle.nft_collection_address.slice(0, 10)}...{raffle.nft_collection_address.slice(-8)}</span>
                  </div>
                  {raffle.winner_address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Winner:</span>
                      <span className="font-mono text-xs">{raffle.winner_address.slice(0, 10)}...{raffle.winner_address.slice(-8)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-12">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">
              <Info className="w-4 h-4 mr-2" />
              Description
            </TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="activity">Live Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-invert max-w-none">
                  {raffle.detailed_description ? (
                    <p className="whitespace-pre-wrap">{raffle.detailed_description}</p>
                  ) : (
                    <p className="text-muted-foreground">No detailed description available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-invert max-w-none">
                  {raffle.rules ? (
                    <p className="whitespace-pre-wrap">{raffle.rules}</p>
                  ) : (
                    <p className="text-muted-foreground">No rules specified.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <LiveTicketFeed raffleId={raffle.id} />
          </TabsContent>
        </Tabs>
      </div>

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        raffle={{
          id: raffle.id,
          name: raffle.name,
          ticketPrice: raffle.ticket_price,
          maxTickets: raffle.max_tickets,
          ticketsSold: onChainTicketsSold !== null ? onChainTicketsSold : raffle.tickets_sold,
          contract_raffle_id: raffle.contract_raffle_id,
          network: raffle.network,
        }}
        account={account}
        onPurchaseSuccess={() => {
          loadRaffle();
          loadOnChainData();
        }}
      />
    </div>
    </>
  );
};

export default RaffleDetail;
