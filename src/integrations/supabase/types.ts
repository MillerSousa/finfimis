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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          color: string | null
          created_at: string | null
          credit_limit: number | null
          id: string
          name: string
          profile_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name: string
          profile_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_history: {
        Row: {
          created_at: string | null
          debtor_id: string
          id: string
          is_received: boolean | null
          month: number
          reminder_method: string | null
          reminder_sent_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          debtor_id: string
          id?: string
          is_received?: boolean | null
          month: number
          reminder_method?: string | null
          reminder_sent_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          debtor_id?: string
          id?: string
          is_received?: boolean | null
          month?: number
          reminder_method?: string | null
          reminder_sent_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_history_debtor_id_fkey"
            columns: ["debtor_id"]
            isOneToOne: false
            referencedRelation: "debtors"
            referencedColumns: ["id"]
          },
        ]
      }
      debtors: {
        Row: {
          created_at: string | null
          description: string | null
          due_day: number | null
          email: string | null
          id: string
          is_recurring: boolean | null
          monthly_value: number | null
          name: string
          pix_key: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_day?: number | null
          email?: string | null
          id?: string
          is_recurring?: boolean | null
          monthly_value?: number | null
          name: string
          pix_key?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_day?: number | null
          email?: string | null
          id?: string
          is_recurring?: boolean | null
          monthly_value?: number | null
          name?: string
          pix_key?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debtors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          card_id: string | null
          category: string | null
          created_at: string | null
          due_day: number | null
          id: string
          is_paid: boolean | null
          is_recurring: boolean | null
          month: number
          name: string
          notes: string | null
          parcel_current: number | null
          parcel_total: number | null
          payment_method: string | null
          profile_id: string
          sort_order: number | null
          value: number
          year: number
        }
        Insert: {
          card_id?: string | null
          category?: string | null
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_paid?: boolean | null
          is_recurring?: boolean | null
          month: number
          name: string
          notes?: string | null
          parcel_current?: number | null
          parcel_total?: number | null
          payment_method?: string | null
          profile_id: string
          sort_order?: number | null
          value: number
          year: number
        }
        Update: {
          card_id?: string | null
          category?: string | null
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_paid?: boolean | null
          is_recurring?: boolean | null
          month?: number
          name?: string
          notes?: string | null
          parcel_current?: number | null
          parcel_total?: number | null
          payment_method?: string | null
          profile_id?: string
          sort_order?: number | null
          value?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_keys: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          key_value: string
          label: string | null
          profile_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          key_value: string
          label?: string | null
          profile_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          key_value?: string
          label?: string | null
          profile_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_keys_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pj_entries: {
        Row: {
          category: string | null
          client: string | null
          created_at: string | null
          description: string
          entry_date: string | null
          id: string
          month: number
          payment_method: string | null
          profile_id: string
          type: string
          value: number
          year: number
        }
        Insert: {
          category?: string | null
          client?: string | null
          created_at?: string | null
          description: string
          entry_date?: string | null
          id?: string
          month: number
          payment_method?: string | null
          profile_id: string
          type: string
          value: number
          year: number
        }
        Update: {
          category?: string | null
          client?: string | null
          created_at?: string | null
          description?: string
          entry_date?: string | null
          id?: string
          month?: number
          payment_method?: string | null
          profile_id?: string
          type?: string
          value?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pj_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pj_goals: {
        Row: {
          created_at: string | null
          id: string
          month: number
          profile_id: string
          revenue_goal: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          profile_id: string
          revenue_goal?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          profile_id?: string
          revenue_goal?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pj_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          created_at: string | null
          due_day: number | null
          id: string
          is_received: boolean | null
          month: number
          parcel_current: number | null
          parcel_total: number | null
          person_name: string
          pix_key: string | null
          profile_id: string
          value: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_received?: boolean | null
          month: number
          parcel_current?: number | null
          parcel_total?: number | null
          person_name: string
          pix_key?: string | null
          profile_id: string
          value?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_received?: boolean | null
          month?: number
          parcel_current?: number | null
          parcel_total?: number | null
          person_name?: string
          pix_key?: string | null
          profile_id?: string
          value?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivables_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
