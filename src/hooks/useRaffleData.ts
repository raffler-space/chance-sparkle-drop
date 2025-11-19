import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRaffleContract } from './useRaffleContract';

export interface RaffleData {
  id: number;
  name: string;
  description: string;
  detailed_description: string;
  prize_description: string;
  rules: string;
  ticket_price: number;
  max_tickets: number;
  image_url: string;
  gallery_images: string[];
  draw_date: string;
  launch_time: string;
  contract_raffle_id: number;
  nft_collection_address: string;
  additional_info: any;
  // Blockchain-sourced fields
  tickets_sold: number;
  status: string;
  winner_address: string;
  is_active: boolean;
  has_ended: boolean;
}

export const useRaffleData = (chainId: number | undefined, account: string | undefined) => {
  const { getRaffleInfo, isContractReady } = useRaffleContract(chainId, account);
  const [raffles, setRaffles] = useState<RaffleData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRaffles = async () => {
    try {
      setLoading(true);
      
      // Fetch metadata from database
      const { data: dbRaffles, error } = await supabase
        .from('raffles')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (!dbRaffles || dbRaffles.length === 0) {
        setRaffles([]);
        setLoading(false);
        return;
      }

      // If contract not ready, show database data as fallback
      if (!isContractReady) {
        const fallbackRaffles = dbRaffles.map(raffle => ({
          ...raffle,
          tickets_sold: raffle.tickets_sold || 0,
          status: raffle.status || 'active',
          winner_address: raffle.winner_address || '',
          is_active: raffle.status === 'active',
          has_ended: raffle.status === 'completed',
          gallery_images: raffle.gallery_images || [],
        }));
        setRaffles(fallbackRaffles);
        setLoading(false);
        return;
      }

      // Fetch blockchain data for each raffle
      const rafflesWithBlockchainData = await Promise.all(
        dbRaffles.map(async (raffle) => {
          if (raffle.contract_raffle_id === null || raffle.contract_raffle_id === undefined) {
            return {
              ...raffle,
              tickets_sold: 0,
              status: 'pending',
              winner_address: '',
              is_active: false,
              has_ended: false,
              gallery_images: raffle.gallery_images || [],
            };
          }

          try {
            const blockchainData = await getRaffleInfo(raffle.contract_raffle_id);
            
            if (blockchainData) {
              const now = new Date().getTime();
              const endTime = Number(blockchainData.endTime) * 1000;
              const hasEnded = now > endTime;
              const isActive = blockchainData.isActive && !hasEnded;
              
              return {
                ...raffle,
                tickets_sold: blockchainData.ticketsSold,
                status: hasEnded ? 'completed' : (isActive ? 'active' : 'pending'),
                winner_address: blockchainData.winner || '',
                is_active: isActive,
                has_ended: hasEnded,
                gallery_images: raffle.gallery_images || [],
              };
            }
          } catch (error) {
            console.error(`Error fetching blockchain data for raffle ${raffle.contract_raffle_id}:`, error);
          }

          // Fallback to database data if blockchain fetch fails
          return {
            ...raffle,
            tickets_sold: raffle.tickets_sold || 0,
            status: raffle.status || 'active',
            winner_address: raffle.winner_address || '',
            is_active: raffle.status === 'active',
            has_ended: raffle.status === 'completed',
            gallery_images: raffle.gallery_images || [],
          };
        })
      );

      setRaffles(rafflesWithBlockchainData);
    } catch (error) {
      console.error('Error loading raffles:', error);
      setRaffles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRaffles();
  }, [chainId, isContractReady]);

  return {
    raffles,
    loading,
    refetch: loadRaffles,
  };
};

export const useSingleRaffleData = (
  raffleId: number | string,
  chainId: number | undefined,
  account: string | undefined
) => {
  const { getRaffleInfo, isContractReady } = useRaffleContract(chainId, account);
  const [raffle, setRaffle] = useState<RaffleData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRaffle = async () => {
    try {
      setLoading(true);

      // Fetch metadata from database
      const { data: dbRaffle, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', parseInt(raffleId as string))
        .maybeSingle();

      if (error) throw error;
      if (!dbRaffle) {
        setRaffle(null);
        setLoading(false);
        return;
      }

      // If contract not ready or no contract ID, return database data
      if (!isContractReady || dbRaffle.contract_raffle_id === null) {
        setRaffle({
          ...dbRaffle,
          tickets_sold: dbRaffle.tickets_sold || 0,
          status: dbRaffle.status || 'active',
          winner_address: dbRaffle.winner_address || '',
          is_active: dbRaffle.status === 'active',
          has_ended: dbRaffle.status === 'completed',
          gallery_images: dbRaffle.gallery_images || [],
        });
        setLoading(false);
        return;
      }

      // Fetch blockchain data
      try {
        const blockchainData = await getRaffleInfo(dbRaffle.contract_raffle_id);
        
        if (blockchainData) {
          const now = new Date().getTime();
          const endTime = Number(blockchainData.endTime) * 1000;
          const hasEnded = now > endTime;
          const isActive = blockchainData.isActive && !hasEnded;
          
          setRaffle({
            ...dbRaffle,
            tickets_sold: blockchainData.ticketsSold,
            status: hasEnded ? 'completed' : (isActive ? 'active' : 'pending'),
            winner_address: blockchainData.winner || '',
            is_active: isActive,
            has_ended: hasEnded,
            gallery_images: dbRaffle.gallery_images || [],
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
      }

      // Fallback to database data
      setRaffle({
        ...dbRaffle,
        tickets_sold: dbRaffle.tickets_sold || 0,
        status: dbRaffle.status || 'active',
        winner_address: dbRaffle.winner_address || '',
        is_active: dbRaffle.status === 'active',
        has_ended: dbRaffle.status === 'completed',
        gallery_images: dbRaffle.gallery_images || [],
      });
    } catch (error) {
      console.error('Error loading raffle:', error);
      setRaffle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (raffleId) {
      loadRaffle();
    }
  }, [raffleId, chainId, isContractReady]);

  return {
    raffle,
    loading,
    refetch: loadRaffle,
  };
};
