export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          id: string
          bakery_id: string
          user_id: string
          action_type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          user_id: string
          action_type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          user_id?: string
          action_type?: string
          description?: string | null
          created_at?: string
        }
      }
      admin_email_allowlist: {
        Row: {
          email: string
          created_at: string
        }
        Insert: {
          email: string
          created_at?: string
        }
        Update: {
          email?: string
          created_at?: string
        }
      }
      admins: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
      }
      bakeries: {
        Row: {
          id: string
          name: string
          currency: string
          address: string | null
          created_at: string
          updated_at: string
          logo_url: string | null
        }
        Insert: {
          id?: string
          name: string
          currency?: string
          address?: string | null
          created_at?: string
          updated_at?: string
          logo_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          address?: string | null
          created_at?: string
          updated_at?: string
          logo_url?: string | null
        }
      }
      bakery_invitations: {
        Row: {
          id: string
          bakery_id: string
          token: string
          created_by: string
          used_by: string | null
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          token?: string
          created_by: string
          used_by?: string | null
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          token?: string
          created_by?: string
          used_by?: string | null
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      bakery_members: {
        Row: {
          bakery_id: string
          user_id: string
          role: Database["public"]["Enums"]["bakery_role"]
          created_at: string
        }
        Insert: {
          bakery_id: string
          user_id: string
          role?: Database["public"]["Enums"]["bakery_role"]
          created_at?: string
        }
        Update: {
          bakery_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["bakery_role"]
          created_at?: string
        }
      }
      batch_consumptions: {
        Row: {
          id: string
          bakery_id: string
          batch_id: string
          raw_material_id: string
          quantity_used: number
          unit_cost: number
          line_cost: number
        }
        Insert: {
          id?: string
          bakery_id: string
          batch_id: string
          raw_material_id: string
          quantity_used: number
          unit_cost?: number
          line_cost?: number
        }
        Update: {
          id?: string
          bakery_id?: string
          batch_id?: string
          raw_material_id?: string
          quantity_used?: number
          unit_cost?: number
          line_cost?: number
        }
      }
      batch_outputs: {
        Row: {
          id: string
          bakery_id: string
          batch_id: string
          product_id: string
          quantity_produced: number
          unit_material_cost: number
        }
        Insert: {
          id?: string
          bakery_id: string
          batch_id: string
          product_id: string
          quantity_produced: number
          unit_material_cost?: number
        }
        Update: {
          id?: string
          bakery_id?: string
          batch_id?: string
          product_id?: string
          quantity_produced?: number
          unit_material_cost?: number
        }
      }
      batch_template_ingredients: {
        Row: {
          id: string
          bakery_id: string
          template_id: string
          raw_material_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          template_id: string
          raw_material_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          template_id?: string
          raw_material_id?: string
          quantity?: number
          created_at?: string
        }
      }
      batch_template_items: {
        Row: {
          id: string
          bakery_id: string
          template_id: string
          product_id: string
          planned_quantity: number
        }
        Insert: {
          id?: string
          bakery_id: string
          template_id: string
          product_id: string
          planned_quantity: number
        }
        Update: {
          id?: string
          bakery_id?: string
          template_id?: string
          product_id?: string
          planned_quantity?: number
        }
      }
      batch_templates: {
        Row: {
          id: string
          bakery_id: string
          name: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          name: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          name?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      batches: {
        Row: {
          id: string
          bakery_id: string
          template_id: string | null
          name: string
          status: Database["public"]["Enums"]["batch_status"]
          notes: string | null
          total_material_cost: number
          produced_at: string
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          template_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["batch_status"]
          notes?: string | null
          total_material_cost?: number
          produced_at?: string
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          template_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["batch_status"]
          notes?: string | null
          total_material_cost?: number
          produced_at?: string
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitation_codes: {
        Row: {
          id: string
          code: string
          used: boolean | null
          used_by: string | null
          used_at: string | null
          created_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          used?: boolean | null
          used_by?: string | null
          used_at?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          used?: boolean | null
          used_by?: string | null
          used_at?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      losses: {
        Row: {
          id: string
          bakery_id: string
          product_id: string
          quantity: number
          reason: string | null
          source_sale_item_id: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          bakery_id: string
          product_id: string
          quantity: number
          reason?: string | null
          source_sale_item_id?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          bakery_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          source_sale_item_id?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      product_recipes: {
        Row: {
          id: string
          bakery_id: string
          product_id: string
          raw_material_id: string
          quantity_per_unit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          product_id: string
          raw_material_id: string
          quantity_per_unit?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          product_id?: string
          raw_material_id?: string
          quantity_per_unit?: number | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          bakery_id: string
          name: string
          unit: Database["public"]["Enums"]["product_unit"]
          sale_price: number
          stock: number
          low_stock_threshold: number
          material_cost: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          name: string
          unit?: Database["public"]["Enums"]["product_unit"]
          sale_price: number
          stock?: number
          low_stock_threshold?: number
          material_cost?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          name?: string
          unit?: Database["public"]["Enums"]["product_unit"]
          sale_price?: number
          stock?: number
          low_stock_threshold?: number
          material_cost?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      raw_material_purchases: {
        Row: {
          id: string
          bakery_id: string
          raw_material_id: string
          quantity: number
          unit_price: number
          total_price: number
          supplier: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          bakery_id: string
          raw_material_id: string
          quantity: number
          unit_price: number
          total_price: number
          supplier?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          bakery_id?: string
          raw_material_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          supplier?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      raw_materials: {
        Row: {
          id: string
          bakery_id: string
          name: string
          unit: Database["public"]["Enums"]["material_unit"]
          purchase_price: number
          avg_cost: number
          stock: number
          low_stock_threshold: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          name: string
          unit: Database["public"]["Enums"]["material_unit"]
          purchase_price: number
          avg_cost?: number
          stock?: number
          low_stock_threshold?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          name?: string
          unit?: Database["public"]["Enums"]["material_unit"]
          purchase_price?: number
          avg_cost?: number
          stock?: number
          low_stock_threshold?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales_session_items: {
        Row: {
          id: string
          bakery_id: string
          session_id: string
          product_id: string
          opening_stock: number
          restocked: number
          closing_stock: number
          unsold: number
          price_at_sale: number
          unit_cost_at_sale: number
          quantity_sold: number
          unsold_quantity: number | null
          keep_unsold: boolean | null
          loss_quantity: number | null
          stock_before_sale: number | null
          revenue: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bakery_id: string
          session_id: string
          product_id: string
          opening_stock?: number
          restocked?: number
          closing_stock?: number
          unsold?: number
          price_at_sale?: number
          unit_cost_at_sale?: number
          quantity_sold?: number
          unsold_quantity?: number | null
          keep_unsold?: boolean | null
          loss_quantity?: number | null
          stock_before_sale?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bakery_id?: string
          session_id?: string
          product_id?: string
          opening_stock?: number
          restocked?: number
          closing_stock?: number
          unsold?: number
          price_at_sale?: number
          unit_cost_at_sale?: number
          quantity_sold?: number
          unsold_quantity?: number | null
          keep_unsold?: boolean | null
          loss_quantity?: number | null
          stock_before_sale?: number | null
          revenue?: number | null
          updated_at?: string | null
        }
      }
      sales_sessions: {
        Row: {
          id: string
          bakery_id: string
          name: string
          status: Database["public"]["Enums"]["sales_status"]
          session_date: string
          notes: string | null
          total_revenue: number
          total_loss_value: number
          created_by: string | null
          created_at: string
          closed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          name: string
          status?: Database["public"]["Enums"]["sales_status"]
          session_date?: string
          notes?: string | null
          total_revenue?: number
          total_loss_value?: number
          created_by?: string | null
          created_at?: string
          closed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          name?: string
          status?: Database["public"]["Enums"]["sales_status"]
          session_date?: string
          notes?: string | null
          total_revenue?: number
          total_loss_value?: number
          created_by?: string | null
          created_at?: string
          closed_at?: string | null
          updated_at?: string
        }
      }
      stock_ledger: {
        Row: {
          id: string
          bakery_id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id: string | null
          raw_material_id: string | null
          product_id: string | null
          delta_quantity: number
          delta_value: number
          user_id: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bakery_id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          raw_material_id?: string | null
          product_id?: string | null
          delta_quantity: number
          delta_value?: number
          user_id?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bakery_id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          raw_material_id?: string | null
          product_id?: string | null
          delta_quantity?: number
          delta_value?: number
          user_id?: string | null
          note?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          bakery_id: string | null
          status: string | null
          plan: string | null
          trial_start: string | null
          trial_end: string | null
          subscription_start: string | null
          subscription_end: string | null
          invitation_code_id: string | null
          whatsapp_contact: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bakery_id?: string | null
          status?: string | null
          plan?: string | null
          trial_start?: string | null
          trial_end?: string | null
          subscription_start?: string | null
          subscription_end?: string | null
          invitation_code_id?: string | null
          whatsapp_contact?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bakery_id?: string | null
          status?: string | null
          plan?: string | null
          trial_start?: string | null
          trial_end?: string | null
          subscription_start?: string | null
          subscription_end?: string | null
          invitation_code_id?: string | null
          whatsapp_contact?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Enums: {
      bakery_role: "owner" | "staff"
      batch_status: "draft" | "completed"
      ledger_kind: "purchase" | "batch_consume" | "batch_produce" | "sale" | "loss" | "adjustment"
      material_unit: "kg" | "g" | "L" | "mL" | "unite"
      product_unit: "unite" | "piece" | "kg" | "g"
      sales_status: "open" | "closed"
    }
    Functions: {
      accept_bakery_invitation: {
        Args: { _token: string }
        Returns: string
      }
      close_sales_session: {
        Args: { _session_id: string }
        Returns: void
      }
      create_bakery_invitation: {
        Args: { _bakery_id: string }
        Returns: string
      }
      get_invitation_preview: {
        Args: { _token: string }
        Returns: { bakery_name: string | null; valid: boolean; reason: string | null }[]
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      list_bakery_members: {
        Args: { _bakery_id: string }
        Returns: { user_id: string; email: string; role: Database["public"]["Enums"]["bakery_role"]; created_at: string }[]
      }
      record_batch_simple: {
        Args: { p_batch_id: string }
        Returns: string
      }
      record_batch: {
        Args: { p_bakery_id: string; p_name: string; p_consumptions: Json; p_outputs: Json; p_notes?: string | null }
        Returns: Json
      }
      record_loss: {
        Args: { p_bakery_id: string; p_product_id: string; p_quantity: number; p_reason?: string | null }
        Returns: string
      }
      record_product_sale_simple: {
        Args: { p_bakery_id: string; p_product_id: string; p_quantity: number; p_price: number }
        Returns: string
      }
      record_product_sale: {
        Args: { p_bakery_id: string; p_product_id: string; p_sold_quantity: number; p_unsold_quantity: number; p_keep_unsold: boolean; p_session_id: string }
        Returns: Json
      }
      record_purchase: {
        Args: { p_bakery_id: string; p_raw_material_id: string; p_quantity: number; p_unit_price: number; p_supplier?: string | null }
        Returns: string
      }
      remove_bakery_member: {
        Args: { _bakery_id: string; _user_id: string }
        Returns: void
      }
      transfer_bakery_ownership: {
        Args: { _bakery_id: string; _new_owner_id: string }
        Returns: void
      }
    }
  }
}
