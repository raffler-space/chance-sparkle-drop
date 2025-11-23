import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TicketPurchase {
  id: string;
  wallet_address: string;
  quantity: number;
  purchase_price: number;
  purchased_at: string;
  tx_hash: string;
}

interface LiveTicketFeedProps {
  raffleId: number;
}

const LiveTicketFeed = ({ raffleId }: LiveTicketFeedProps) => {
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllTickets();
    const unsubscribe = subscribeToTickets();
    return unsubscribe;
  }, [raffleId]);

  const loadAllTickets = async () => {
    try {
      const { data: dbTickets, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("raffle_id", raffleId)
        .order("purchased_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTickets(dbTickets || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToTickets = () => {
    const channel = supabase
      .channel(`tickets-${raffleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `raffle_id=eq.${raffleId}`,
        },
        (payload) => {
          const newTicket = payload.new as TicketPurchase;
          setTickets((prev) => [newTicket, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="w-5 h-5 mr-2" />
            Live Ticket Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No tickets purchased yet. Be the first!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Ticket className="w-5 h-5 mr-2" />
          Live Ticket Purchases
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {formatAddress(ticket.wallet_address)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.purchased_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  {ticket.quantity} {ticket.quantity === 1 ? "Ticket" : "Tickets"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {ticket.purchase_price} USDT
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveTicketFeed;
