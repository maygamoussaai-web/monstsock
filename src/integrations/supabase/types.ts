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
      activity_log: {
        Row: {
          action_type: string
          bakery_id: string
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          bakery_id: string
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          bakery_id?: string
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_email_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          is_primary: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      bakeries: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bakery_invitations: {
        Row: {
          bakery_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          bakery_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          bakery_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bakery_invitations_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      bakery_members: {
        Row: {
          bakery_id: string
          created_at: string
          full_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          full_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          full_name?: string | null
          phone?: string | null
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
      batch_template_ingredients: {
        Row: {
          bakery_id: string
          created_at: string
          id: string
          quantity: number
          raw_material_id: string
          template_id: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          id?: string
          quantity: number
          raw_material_id: string
          template_id: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          id?: string
          quantity?: number
          raw_material_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_template_ingredients_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_template_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_template_ingredients_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "batch_templates"
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
      invitation_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          plan: string | null
          used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan?: string | null
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan?: string | null
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      losses: {
        Row: {
          bakery_id: string
          created_at: string | null
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          source_sale_item_id: string | null
        }
        Insert: {
          bakery_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          source_sale_item_id?: string | null
        }
        Update: {
          bakery_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          source_sale_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "losses_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "losses_source_sale_item_id_fkey"
            columns: ["source_sale_item_id"]
            isOneToOne: false
            referencedRelation: "sales_session_items"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_client_refs: {
        Row: {
          client_ref: string
          created_at: string
        }
        Insert: {
          client_ref: string
          created_at?: string
        }
        Update: {
          client_ref?: string
          created_at?: string
        }
        Relationships: []
      }
      product_recipes: {
        Row: {
          bakery_id: string
          created_at: string
          id: string
          product_id: string
          quantity_per_unit: number | null
          raw_material_id: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity_per_unit?: number | null
          raw_material_id: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity_per_unit?: number | null
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
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
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
      push_subscriptions: {
        Row: {
          auth_key: string
          bakery_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          bakery_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          bakery_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_bakery_id_fkey"
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
      raw_material_units: {
        Row: {
          bakery_id: string
          created_at: string
          display_order: number
          factor: number
          id: string
          name: string
          raw_material_id: string
          updated_at: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          display_order?: number
          factor: number
          id?: string
          name: string
          raw_material_id: string
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          display_order?: number
          factor?: number
          id?: string
          name?: string
          raw_material_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_units_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_material_units_raw_material_id_fkey"
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
          display_unit_id: string | null
          id: string
          is_active: boolean
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
          display_unit_id?: string | null
          id?: string
          is_active?: boolean
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
          display_unit_id?: string | null
          id?: string
          is_active?: boolean
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
          {
            foreignKeyName: "raw_materials_display_unit_id_fkey"
            columns: ["display_unit_id"]
            isOneToOne: false
            referencedRelation: "raw_material_units"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_session_items: {
        Row: {
          bakery_id: string
          closing_stock: number
          id: string
          keep_unsold: boolean | null
          loss_quantity: number | null
          opening_stock: number
          price_at_sale: number
          product_id: string
          quantity_sold: number
          restocked: number
          revenue: number | null
          session_id: string
          stock_before_sale: number | null
          unit_cost_at_sale: number
          unsold: number
          unsold_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          bakery_id: string
          closing_stock?: number
          id?: string
          keep_unsold?: boolean | null
          loss_quantity?: number | null
          opening_stock?: number
          price_at_sale?: number
          product_id: string
          quantity_sold?: number
          restocked?: number
          revenue?: number | null
          session_id: string
          stock_before_sale?: number | null
          unit_cost_at_sale?: number
          unsold?: number
          unsold_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          bakery_id?: string
          closing_stock?: number
          id?: string
          keep_unsold?: boolean | null
          loss_quantity?: number | null
          opening_stock?: number
          price_at_sale?: number
          product_id?: string
          quantity_sold?: number
          restocked?: number
          revenue?: number | null
          session_id?: string
          stock_before_sale?: number | null
          unit_cost_at_sale?: number
          unsold?: number
          unsold_quantity?: number | null
          updated_at?: string | null
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
      subscriptions: {
        Row: {
          bakery_id: string | null
          created_at: string | null
          id: string
          invitation_code_id: string | null
          plan: string | null
          status: string | null
          subscription_end: string | null
          subscription_start: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
          whatsapp_contact: string | null
        }
        Insert: {
          bakery_id?: string | null
          created_at?: string | null
          id?: string
          invitation_code_id?: string | null
          plan?: string | null
          status?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_contact?: string | null
        }
        Update: {
          bakery_id?: string | null
          created_at?: string | null
          id?: string
          invitation_code_id?: string | null
          plan?: string | null
          status?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_invitation_code_id_fkey"
            columns: ["invitation_code_id"]
            isOneToOne: false
            referencedRelation: "invitation_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_usage: {
        Row: {
          email: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_bakery_invitation: { Args: { _token: string }; Returns: string }
      admin_delete_bakery: { Args: { _bakery_id: string }; Returns: undefined }
      admin_get_user: {
        Args: { _user_id: string }
        Returns: {
          bakery_address: string
          bakery_id: string
          bakery_name: string
          created_at: string
          display_name: string
          email: string
          is_admin: boolean
          last_sign_in_at: string
          member_since: string
          phone: string
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }[]
      }
      admin_list_bakery_members: {
        Args: { _bakery_id: string }
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          bakery_id: string
          bakery_name: string
          created_at: string
          display_name: string
          email: string
          is_admin: boolean
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }[]
      }
      admin_set_subscription_status: {
        Args: { _status: string; _subscription_id: string }
        Returns: string
      }
      admin_unblock_subscription: {
        Args: { _subscription_id: string }
        Returns: string
      }
      calculate_batch_unit_cost: {
        Args: { p_quantity_produced: number; p_total_material_cost: number }
        Returns: number
      }
      calculate_sale: {
        Args: { stock_qty: number; unit_price: number; unsold_qty: number }
        Returns: {
          revenue: number
          sold_qty: number
        }[]
      }
      check_access: { Args: { p_user_id: string }; Returns: boolean }
      claim_bakery: {
        Args: { _bakery_name: string; _code: string }
        Returns: string
      }
      claim_client_ref: { Args: { _ref: string }; Returns: boolean }
      cleanup_old_client_refs: { Args: never; Returns: undefined }
      close_sales_session: {
        Args: { _client_ref?: string; _session_id: string }
        Returns: undefined
      }
      create_bakery_invitation: {
        Args: { _bakery_id: string }
        Returns: string
      }
      current_bakery_id: { Args: never; Returns: string }
      get_invitation_preview: {
        Args: { _token: string }
        Returns: {
          bakery_name: string
          reason: string
          valid: boolean
        }[]
      }
      get_user_bakery_id: { Args: never; Returns: string }
      has_bakery_access: { Args: { _bakery_id: string }; Returns: boolean }
      internal_send_push: {
        Args: {
          _bakery_id: string
          _body: string
          _title: string
          _url?: string
        }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_primary_admin: { Args: { _user_id: string }; Returns: boolean }
      list_bakery_members: {
        Args: { _bakery_id: string }
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["bakery_role"]
          user_id: string
        }[]
      }
      owner_delete_bakery: { Args: { _bakery_id: string }; Returns: undefined }
      owner_soft_delete_bakery: {
        Args: { _bakery_id: string }
        Returns: undefined
      }
      recompute_product_material_cost: {
        Args: { _product_id: string }
        Returns: undefined
      }
      record_batch: {
        Args: {
          p_bakery_id: string
          p_client_ref?: string
          p_consumptions: Json
          p_name: string
          p_notes?: string
          p_outputs: Json
        }
        Returns: Json
      }
      record_loss: {
        Args: {
          p_bakery_id: string
          p_client_ref?: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
        }
        Returns: string
      }
      record_product_sale: {
        Args: {
          p_bakery_id: string
          p_client_ref?: string
          p_price: number
          p_product_id: string
          p_quantity: number
        }
        Returns: string
      }
      record_purchase: {
        Args: {
          p_bakery_id: string
          p_client_ref?: string
          p_quantity: number
          p_raw_material_id: string
          p_supplier?: string
          p_unit_price: number
        }
        Returns: string
      }
      record_quick_sale: {
        Args: {
          p_bakery_id: string
          p_client_ref?: string
          p_kept_quantity?: number
          p_product_id: string
          p_quantity_sold: number
          p_thrown_quantity?: number
          p_unit_price: number
        }
        Returns: string
      }
      remove_bakery_member: {
        Args: { _bakery_id: string; _user_id: string }
        Returns: undefined
      }
      send_daily_reminder: {
        Args: { p_body: string; p_title: string; p_url: string }
        Returns: undefined
      }
      send_test_push: { Args: never; Returns: undefined }
      subscription_active: { Args: { _bakery_id: string }; Returns: boolean }
      transfer_bakery_ownership: {
        Args: { _bakery_id: string; _new_owner_id: string }
        Returns: undefined
      }
      use_invitation_code: {
        Args: { p_bakery_id: string; p_code: string }
        Returns: Json
      }
      user_has_bakery_access: {
        Args: { p_bakery_id: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
