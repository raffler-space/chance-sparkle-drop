import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import { getNetworkConfig } from "@/config/contracts";

interface TicketPurchase {
  id: string;
  wallet_address: string;
  quantity: number;
  purchase_price: number;
  purchased_at: string;
  tx_hash: string;
  source?: 'database' | 'blockchain';
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
      // Get raffle details including creation time
      const { data: raffle } = await supabase
        .from("raffles")
        .select("contract_raffle_id, network, created_at")
        .eq("id", raffleId)
        .single();

      // Load tickets from database
      const { data: dbTickets, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("raffle_id", raffleId)
        .order("purchased_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const ticketsWithSource = (dbTickets || []).map(t => ({ ...t, source: 'database' as const }));

      // If raffle has contract_raffle_id, fetch blockchain events as backup
      if (raffle?.contract_raffle_id !== null && raffle?.contract_raffle_id !== undefined) {
        try {
          const networkConfig = getNetworkConfig(raffle.network === 'sepolia' ? 11155111 : 1);
          const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
          const raffleContract = new ethers.Contract(
            networkConfig.contracts.raffle,
            ["event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 quantity, uint256 totalPrice)"],
            provider
          );

          // Calculate the starting block based on raffle creation time
          const currentBlock = await provider.getBlockNumber();
          const raffleCreatedAt = new Date(raffle.created_at).getTime();
          const currentTime = Date.now();
          const timeDiffSeconds = (currentTime - raffleCreatedAt) / 1000;
          const avgBlockTime = 12; // Ethereum average block time in seconds
          const estimatedBlocksSinceCreation = Math.ceil(timeDiffSeconds / avgBlockTime);
          
          // Start from estimated creation block, search forward to current block
          const fromBlock = Math.max(0, currentBlock - estimatedBlocksSinceCreation - 100); // Add 100 block buffer
          const CHUNK_SIZE = 49999; // Just under 50k limit
          
          console.log(`Raffle created at: ${raffle.created_at}`);
          console.log(`Estimated blocks since creation: ${estimatedBlocksSinceCreation}`);
          console.log(`Fetching blockchain events for raffle ${raffle.contract_raffle_id} from block ${fromBlock} to ${currentBlock}`);
          
          const filter = raffleContract.filters.TicketPurchased(raffle.contract_raffle_id);
          const allEvents = [];
          
          // Query in chunks to respect RPC provider's block range limit (50k blocks)
          for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
            const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
            try {
              const chunkEvents = await raffleContract.queryFilter(filter, start, end);
              allEvents.push(...chunkEvents);
              console.log(`Chunk ${start}-${end}: Found ${chunkEvents.length} events`);
            } catch (chunkError) {
              console.error(`Error querying chunk ${start}-${end}:`, chunkError);
            }
          }
          
          const events = allEvents;
          console.log(`Total events found: ${events.length}`);

          // Get block timestamps for events
          console.log(`Found ${events.length} blockchain events for raffle ${raffle.contract_raffle_id}`);
          
          const blockchainTickets = await Promise.all(
            events.map(async (event) => {
              try {
                const block = await event.getBlock();
                const txHash = event.transactionHash;
                
                console.log(`Processing event: tx=${txHash}, buyer=${event.args?.buyer}, quantity=${event.args?.quantity}`);
                
                // Check if this tx_hash already exists in database tickets
                const existsInDb = ticketsWithSource.some(t => t.tx_hash.toLowerCase() === txHash.toLowerCase());
                
                if (!existsInDb) {
                  const ticket: TicketPurchase = {
                    id: txHash,
                    wallet_address: event.args?.buyer || '',
                    quantity: event.args?.quantity?.toNumber() || 0,
                    purchase_price: event.args?.totalPrice ? parseFloat(ethers.utils.formatUnits(event.args.totalPrice, 6)) : 0,
                    purchased_at: new Date(block.timestamp * 1000).toISOString(),
                    tx_hash: txHash,
                    source: 'blockchain',
                  };
                  console.log(`Adding blockchain ticket: ${txHash}`);
                  return ticket;
                } else {
                  console.log(`Ticket ${txHash} already exists in database`);
                }
              } catch (error) {
                console.error(`Error processing event:`, error);
              }
              return null;
            })
          );

          const validBlockchainTickets = blockchainTickets.filter((t): t is TicketPurchase => t !== null);
          
          console.log(`Valid blockchain tickets: ${validBlockchainTickets.length}, Database tickets: ${ticketsWithSource.length}`);
          
          // Merge and sort all tickets
          const allTickets = [...ticketsWithSource, ...validBlockchainTickets]
            .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
            .slice(0, 50);

          console.log(`Total tickets to display: ${allTickets.length}`);
          setTickets(allTickets);
        } catch (blockchainError) {
          console.error("Error fetching blockchain tickets:", blockchainError);
          setTickets(ticketsWithSource);
        }
      } else {
        setTickets(ticketsWithSource);
      }
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
