import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Ticket } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface RaffleCardProps {
  id: number;
  title: string;
  description: string;
  prize: string;
  image: string;
  ticketPrice: string;
  totalTickets: number;
  soldTickets: number;
  endDate: Date;
  isActive: boolean;
  onEnter: (id: number) => void;
}

export const RaffleCard = ({
  id,
  title,
  description,
  prize,
  image,
  ticketPrice,
  totalTickets,
  soldTickets,
  endDate,
  isActive,
  onEnter,
}: RaffleCardProps) => {
  const timeRemaining = () => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  const progressPercentage = (soldTickets / totalTickets) * 100;

  return (
    <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden group">
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <Badge
          className={`absolute top-4 right-4 ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isActive ? 'Active' : 'Ended'}
        </Badge>
      </div>

      <CardHeader>
        <h3 className="text-2xl font-orbitron font-bold text-glow">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <div className="pt-2">
          <p className="text-accent font-bold text-xl">{prize}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Price</div>
            <div className="font-bold text-primary">{ticketPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Sold</div>
            <div className="font-bold flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              {soldTickets}/{totalTickets}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Ends In</div>
            <div className="font-bold flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              {timeRemaining()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onEnter(id)}
          disabled={!isActive}
          className="w-full bg-gradient-to-r from-purple to-secondary hover:opacity-90 font-orbitron"
        >
          <Ticket className="mr-2 h-4 w-4" />
          Enter Raffle
        </Button>
      </CardFooter>
    </Card>
  );
};
