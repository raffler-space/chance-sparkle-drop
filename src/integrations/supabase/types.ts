export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          subject: string
          template_key: string
          template_name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          subject: string
          template_key: string
          template_name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          subject?: string
          template_key?: string
          template_name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      prize_claims: {
        Row: {
          created_at: string
          delivery_info: string
          id: string
          processed_at: string | null
          raffle_id: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_info: string
          id?: string
          processed_at?: string | null
          raffle_id: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_info?: string
          id?: string
          processed_at?: string | null
          raffle_id?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_claims_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          additional_info: Json | null
          completed_at: string | null
          contract_raffle_id: number | null
          created_at: string
          description: string | null
          detailed_description: string | null
          display_order: number | null
          draw_date: string | null
          draw_tx_hash: string | null
          gallery_images: string[] | null
          id: number
          image_url: string | null
          launch_time: string | null
          max_tickets: number
          name: string
          network: string
          nft_collection_address: string
          prize_description: string
          rules: string | null
          show_on_home: boolean
          show_on_raffles: boolean
          status: string | null
          ticket_price: number
          tickets_sold: number | null
          winner_address: string | null
        }
        Insert: {
          additional_info?: Json | null
          completed_at?: string | null
          contract_raffle_id?: number | null
          created_at?: string
          description?: string | null
          detailed_description?: string | null
          display_order?: number | null
          draw_date?: string | null
          draw_tx_hash?: string | null
          gallery_images?: string[] | null
          id?: number
          image_url?: string | null
          launch_time?: string | null
          max_tickets: number
          name: string
          network?: string
          nft_collection_address: string
          prize_description: string
          rules?: string | null
          show_on_home?: boolean
          show_on_raffles?: boolean
          status?: string | null
          ticket_price: number
          tickets_sold?: number | null
          winner_address?: string | null
        }
        Update: {
          additional_info?: Json | null
          completed_at?: string | null
          contract_raffle_id?: number | null
          created_at?: string
          description?: string | null
          detailed_description?: string | null
          display_order?: number | null
          draw_date?: string | null
          draw_tx_hash?: string | null
          gallery_images?: string[] | null
          id?: number
          image_url?: string | null
          launch_time?: string | null
          max_tickets?: number
          name?: string
          network?: string
          nft_collection_address?: string
          prize_description?: string
          rules?: string | null
          show_on_home?: boolean
          show_on_raffles?: boolean
          status?: string | null
          ticket_price?: number
          tickets_sold?: number | null
          winner_address?: string | null
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string | null
          id: string
          paid_at: string | null
          raffle_id: number
          referred_id: string
          referrer_id: string
          status: string
          ticket_id: string
        }
        Insert: {
          amount: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          raffle_id: number
          referred_id: string
          referrer_id: string
          status?: string
          ticket_id: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          raffle_id?: number
          referred_id?: string
          referrer_id?: string
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          raffle_id: number
          status: string
          tx_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          raffle_id: number
          status?: string
          tx_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          raffle_id?: number
          status?: string
          tx_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content_key: string
          content_value: string
          description: string | null
          id: string
          page: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content_key: string
          content_value: string
          description?: string | null
          id?: string
          page: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content_key?: string
          content_value?: string
          description?: string | null
          id?: string
          page?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          purchase_price: number
          purchased_at: string
          quantity: number
          raffle_id: number
          ticket_number: number
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          id?: string
          purchase_price: number
          purchased_at?: string
          quantity?: number
          raffle_id: number
          ticket_number: number
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Update: {
          id?: string
          purchase_price?: number
          purchased_at?: string
          quantity?: number
          raffle_id?: number
          ticket_number?: number
          tx_hash?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          raffle_id: number
          status: string | null
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          raffle_id: number
          status?: string | null
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          raffle_id?: number
          status?: string | null
          tx_hash?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
