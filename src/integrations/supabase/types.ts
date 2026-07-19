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
      bakeries: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bakery_members: {
        Row: {
          bakery_id: string
          created_at: string
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["bakery_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bakery_members_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_consumptions: {
        Row: {
          bakery_id: string
          batch_id: string
          id: string
          line_cost: number
          quantity_used: number
          raw_material_id: string
          unit_cost: number
        }
        Insert: {
          bakery_id: string
          batch_id: string
          id?: string
          line_cost?: number
          quantity_used: number
          raw_material_id: string
          unit_cost?: number
        }
        Update: {
          bakery_id?: string
          batch_id?: string
          id?: string
          line_cost?: number
          quantity_used?: number
          raw_material_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_consumptions_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_consumptions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_consumptions_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_outputs: {
        Row: {
          bakery_id: string
          batch_id: string
          id: string
          product_id: string
          quantity_produced: number
          unit_material_cost: number
        }
        Insert: {
          bakery_id: string
          batch_id: string
          id?: string
          product_id: string
          quantity_produced: number
          unit_material_cost?: number
        }
        Update: {
          bakery_id?: string
          batch_id?: string
          id?: string
          product_id?: string
          quantity_produced?: number
          unit_material_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_outputs_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_outputs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_outputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_template_items: {
        Row: {
          bakery_id: string
          id: string
          planned_quantity: number
          product_id: string
          template_id: string
        }
        Insert: {
          bakery_id: string
          id?: string
          planned_quantity: number
          product_id: string
          template_id: string
        }
        Update: {
          bakery_id?: string
          id?: string
          planned_quantity?: number
          product_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_template_items_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_template_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "batch_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_templates: {
        Row: {
          bakery_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_templates_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          bakery_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          produced_at: string
          status: Database["public"]["Enums"]["batch_status"]
          template_id: string | null
          total_material_cost: number
          updated_at: string
        }
        Insert: {
          bakery_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          produced_at?: string
          status?: Database["public"]["Enums"]["batch_status"]
          template_id?: string | null
          total_material_cost?: number
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          produced_at?: string
          status?: Database["public"]["Enums"]["batch_status"]
          template_id?: string | null
          total_material_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "batch_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          bakery_id: string
          created_at: string
          id: string
          product_id: string
          quantity_per_unit: number
          raw_material_id: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity_per_unit: number
          raw_material_id: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity_per_unit?: number
          raw_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bakery_id: string
          created_at: string
          id: string
          low_stock_threshold: number
          material_cost: number
          name: string
          notes: string | null
          sale_price: number
          stock: number
          unit: Database["public"]["Enums"]["product_unit"]
          updated_at: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          material_cost?: number
          name: string
          notes?: string | null
          sale_price: number
          stock?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          material_cost?: number
          name?: string
          notes?: string | null
          sale_price?: number
          stock?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_material_purchases: {
        Row: {
          bakery_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity: number
          raw_material_id: string
          supplier: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          bakery_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity: number
          raw_material_id: string
          supplier?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          bakery_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          raw_material_id?: string
          supplier?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_purchases_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_material_purchases_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          avg_cost: number
          bakery_id: string
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          notes: string | null
          purchase_price: number
          stock: number
          unit: Database["public"]["Enums"]["material_unit"]
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          bakery_id: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          notes?: string | null
          purchase_price: number
          stock?: number
          unit: Database["public"]["Enums"]["material_unit"]
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          bakery_id?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          notes?: string | null
          purchase_price?: number
          stock?: number
          unit?: Database["public"]["Enums"]["material_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_session_items: {
        Row: {
          bakery_id: string
          closing_stock: number
          id: string
          opening_stock: number
          price_at_sale: number
          product_id: string
          quantity_sold: number
          restocked: number
          session_id: string
          unit_cost_at_sale: number
          unsold: number
        }
        Insert: {
          bakery_id: string
          closing_stock?: number
          id?: string
          opening_stock?: number
          price_at_sale?: number
          product_id: string
          quantity_sold?: number
          restocked?: number
          session_id: string
          unit_cost_at_sale?: number
          unsold?: number
        }
        Update: {
          bakery_id?: string
          closing_stock?: number
          id?: string
          opening_stock?: number
          price_at_sale?: number
          product_id?: string
          quantity_sold?: number
          restocked?: number
          session_id?: string
          unit_cost_at_sale?: number
          unsold?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_session_items_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sales_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_sessions: {
        Row: {
          bakery_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          session_date: string
          status: Database["public"]["Enums"]["sales_status"]
          total_loss_value: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          bakery_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["sales_status"]
          total_loss_value?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["sales_status"]
          total_loss_value?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_sessions_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          bakery_id: string
          created_at: string
          delta_quantity: number
          delta_value: number
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          product_id: string | null
          raw_material_id: string | null
          ref_id: string | null
          user_id: string | null
        }
        Insert: {
          bakery_id: string
          created_at?: string
          delta_quantity: number
          delta_value?: number
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          product_id?: string | null
          raw_material_id?: string | null
          ref_id?: string | null
          user_id?: string | null
        }
        Update: {
          bakery_id?: string
          created_at?: string
          delta_quantity?: number
          delta_value?: number
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          product_id?: string | null
          raw_material_id?: string | null
          ref_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_sales_session: { Args: { _session_id: string }; Returns: undefined }
      complete_batch: { Args: { _batch_id: string }; Returns: undefined }
      current_bakery_id: { Args: never; Returns: string }
      has_bakery_access: { Args: { _bakery_id: string }; Returns: boolean }
      recompute_product_material_cost: {
        Args: { _product_id: string }
        Returns: undefined
      }
    }
    Enums: {
      bakery_role: "owner" | "staff"
      batch_status: "draft" | "completed"
      ledger_kind:
        | "purchase"
        | "batch_consume"
        | "batch_produce"
        | "sale"
        | "loss"
        | "adjustment"
      material_unit: "kg" | "g" | "L" | "mL" | "unite"
      product_unit: "unite" | "piece" | "kg" | "g"
      sales_status: "open" | "closed"
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
      bakery_role: ["owner", "staff"],
      batch_status: ["draft", "completed"],
      ledger_kind: [
        "purchase",
        "batch_consume",
        "batch_produce",
        "sale",
        "loss",
        "adjustment",
      ],
      material_unit: ["kg", "g", "L", "mL", "unite"],
      product_unit: ["unite", "piece", "kg", "g"],
      sales_status: ["open", "closed"],
    },
  },
} as const
