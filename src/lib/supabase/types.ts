export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          email: string;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          image_path: string | null;
          is_coming_soon: boolean;
          name: string;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: never;
          image_path?: string | null;
          is_coming_soon?: boolean;
          name: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: never;
          image_path?: string | null;
          is_coming_soon?: boolean;
          name?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string | null;
          id: number;
          ip_hash: string | null;
          is_read: boolean;
          message: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: never;
          ip_hash?: string | null;
          is_read?: boolean;
          message: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: never;
          ip_hash?: string | null;
          is_read?: boolean;
          message?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      document_counters: {
        Row: {
          kind: string;
          last_value: number;
          period: string;
        };
        Insert: {
          kind: string;
          last_value?: number;
          period: string;
        };
        Update: {
          kind?: string;
          last_value?: number;
          period?: string;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          answer: string;
          group_name: string | null;
          id: number;
          is_active: boolean;
          question: string;
          sort_order: number;
        };
        Insert: {
          answer: string;
          group_name?: string | null;
          id?: never;
          is_active?: boolean;
          question: string;
          sort_order?: number;
        };
        Update: {
          answer?: string;
          group_name?: string | null;
          id?: never;
          is_active?: boolean;
          question?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      gift_card_redemptions: {
        Row: {
          amount: number;
          created_at: string;
          gift_card_id: number;
          id: number;
          order_id: string;
          reversed_at: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          gift_card_id: number;
          id?: never;
          order_id: string;
          reversed_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          gift_card_id?: number;
          id?: never;
          order_id?: string;
          reversed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey";
            columns: ["gift_card_id"];
            isOneToOne: false;
            referencedRelation: "gift_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_card_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_cards: {
        Row: {
          balance: number;
          code: string;
          created_at: string;
          expires_at: string | null;
          id: number;
          initial_balance: number;
          is_active: boolean;
          is_test: boolean;
          note: string | null;
        };
        Insert: {
          balance: number;
          code: string;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          initial_balance: number;
          is_active?: boolean;
          is_test?: boolean;
          note?: string | null;
        };
        Update: {
          balance?: number;
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          initial_balance?: number;
          is_active?: boolean;
          is_test?: boolean;
          note?: string | null;
        };
        Relationships: [];
      };
      hero_slides: {
        Row: {
          alt: string;
          id: number;
          image_desktop_path: string;
          image_mobile_path: string;
          is_active: boolean;
          label: string | null;
          link_url: string | null;
          sort_order: number;
        };
        Insert: {
          alt: string;
          id?: never;
          image_desktop_path: string;
          image_mobile_path: string;
          is_active?: boolean;
          label?: string | null;
          link_url?: string | null;
          sort_order?: number;
        };
        Update: {
          alt?: string;
          id?: never;
          image_desktop_path?: string;
          image_mobile_path?: string;
          is_active?: boolean;
          label?: string | null;
          link_url?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      lifestyle_tiles: {
        Row: {
          alt: string;
          caption: string | null;
          category_id: number | null;
          id: number;
          image_path: string;
          insert_after_position: number;
          is_active: boolean;
          link_url: string | null;
          span: number;
        };
        Insert: {
          alt: string;
          caption?: string | null;
          category_id?: number | null;
          id?: never;
          image_path: string;
          insert_after_position: number;
          is_active?: boolean;
          link_url?: string | null;
          span?: number;
        };
        Update: {
          alt?: string;
          caption?: string | null;
          category_id?: number | null;
          id?: never;
          image_path?: string;
          insert_after_position?: number;
          is_active?: boolean;
          link_url?: string | null;
          span?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lifestyle_tiles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          actor_email: string | null;
          created_at: string;
          from_value: string | null;
          id: number;
          note: string | null;
          order_id: string;
          to_value: string | null;
          type: Database["public"]["Enums"]["order_event_type"];
        };
        Insert: {
          actor_email?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: never;
          note?: string | null;
          order_id: string;
          to_value?: string | null;
          type: Database["public"]["Enums"]["order_event_type"];
        };
        Update: {
          actor_email?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: never;
          note?: string | null;
          order_id?: string;
          to_value?: string | null;
          type?: Database["public"]["Enums"]["order_event_type"];
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: number;
          image_path_snapshot: string | null;
          line_total: number;
          name_snapshot: string;
          order_id: string;
          product_id: number | null;
          quantity: number;
          unit_price: number;
          variant_label: string | null;
        };
        Insert: {
          id?: never;
          image_path_snapshot?: string | null;
          line_total: number;
          name_snapshot: string;
          order_id: string;
          product_id?: number | null;
          quantity: number;
          unit_price: number;
          variant_label?: string | null;
        };
        Update: {
          id?: never;
          image_path_snapshot?: string | null;
          line_total?: number;
          name_snapshot?: string;
          order_id?: string;
          product_id?: number | null;
          quantity?: number;
          unit_price?: number;
          variant_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          access_token: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          country: string;
          courier_name: string | null;
          created_at: string;
          customer_name: string;
          email: string | null;
          gift_card_amount: number;
          gift_card_code: string | null;
          gift_note: string | null;
          gst_amount: number;
          id: string;
          idempotency_key: string | null;
          internal_notes: string | null;
          invoice_number: string | null;
          invoice_path: string | null;
          is_gift: boolean;
          is_test: boolean;
          landmark: string | null;
          order_number: string;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          phone: string;
          pincode: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          shipping_fee: number;
          state: string;
          status: Database["public"]["Enums"]["order_status"];
          stock_released_at: string | null;
          subtotal: number;
          total: number;
          tracking_number: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          country?: string;
          courier_name?: string | null;
          created_at?: string;
          customer_name: string;
          email?: string | null;
          gift_card_amount?: number;
          gift_card_code?: string | null;
          gift_note?: string | null;
          gst_amount?: number;
          id?: string;
          idempotency_key?: string | null;
          internal_notes?: string | null;
          invoice_number?: string | null;
          invoice_path?: string | null;
          is_gift?: boolean;
          is_test?: boolean;
          landmark?: string | null;
          order_number: string;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          phone: string;
          pincode: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          shipping_fee?: number;
          state: string;
          status?: Database["public"]["Enums"]["order_status"];
          stock_released_at?: string | null;
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          country?: string;
          courier_name?: string | null;
          created_at?: string;
          customer_name?: string;
          email?: string | null;
          gift_card_amount?: number;
          gift_card_code?: string | null;
          gift_note?: string | null;
          gst_amount?: number;
          id?: string;
          idempotency_key?: string | null;
          internal_notes?: string | null;
          invoice_number?: string | null;
          invoice_path?: string | null;
          is_gift?: boolean;
          is_test?: boolean;
          landmark?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          phone?: string;
          pincode?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          shipping_fee?: number;
          state?: string;
          status?: Database["public"]["Enums"]["order_status"];
          stock_released_at?: string | null;
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          body: string;
          id: number;
          images: NonNullable<Json>;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          id?: never;
          images?: NonNullable<Json>;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          id?: never;
          images?: NonNullable<Json>;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          alt: string;
          blur_data_url: string | null;
          height: number | null;
          id: number;
          product_id: number;
          role: Database["public"]["Enums"]["image_role"];
          sort_order: number;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          alt: string;
          blur_data_url?: string | null;
          height?: number | null;
          id?: never;
          product_id: number;
          role: Database["public"]["Enums"]["image_role"];
          sort_order?: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt?: string;
          blur_data_url?: string | null;
          height?: number | null;
          id?: never;
          product_id?: number;
          role?: Database["public"]["Enums"]["image_role"];
          sort_order?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_relations: {
        Row: {
          kind: Database["public"]["Enums"]["relation_kind"];
          product_id: number;
          related_product_id: number;
          sort_order: number;
        };
        Insert: {
          kind: Database["public"]["Enums"]["relation_kind"];
          product_id: number;
          related_product_id: number;
          sort_order?: number;
        };
        Update: {
          kind?: Database["public"]["Enums"]["relation_kind"];
          product_id?: number;
          related_product_id?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_relations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_relations_related_product_id_fkey";
            columns: ["related_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          colour: string | null;
          id: number;
          label: string;
          product_id: number;
          sort_order: number;
          stock_qty: number;
        };
        Insert: {
          colour?: string | null;
          id?: never;
          label: string;
          product_id: number;
          sort_order?: number;
          stock_qty?: number;
        };
        Update: {
          colour?: string | null;
          id?: never;
          label?: string;
          product_id?: number;
          sort_order?: number;
          stock_qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          best_seller_position: number | null;
          care_override: string | null;
          category_id: number;
          chain_length: string | null;
          closure: string | null;
          colours: string[];
          created_at: string;
          description: string | null;
          id: number;
          is_best_seller: boolean;
          is_gift_for_her: boolean;
          is_hero: boolean;
          is_new_arrival: boolean;
          is_published: boolean;
          materials: string[];
          merch_position: number | null;
          name: string;
          new_arrival_position: number | null;
          price: number | null;
          published_at: string | null;
          search_vector: unknown;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string | null;
          slug: string;
          stock_qty: number;
          stones: string[];
          styles: string[];
          updated_at: string;
        };
        Insert: {
          best_seller_position?: number | null;
          care_override?: string | null;
          category_id: number;
          chain_length?: string | null;
          closure?: string | null;
          colours?: string[];
          created_at?: string;
          description?: string | null;
          id?: never;
          is_best_seller?: boolean;
          is_gift_for_her?: boolean;
          is_hero?: boolean;
          is_new_arrival?: boolean;
          is_published?: boolean;
          materials?: string[];
          merch_position?: number | null;
          name: string;
          new_arrival_position?: number | null;
          price?: number | null;
          published_at?: string | null;
          search_vector?: unknown;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          slug: string;
          stock_qty?: number;
          stones?: string[];
          styles?: string[];
          updated_at?: string;
        };
        Update: {
          best_seller_position?: number | null;
          care_override?: string | null;
          category_id?: number;
          chain_length?: string | null;
          closure?: string | null;
          colours?: string[];
          created_at?: string;
          description?: string | null;
          id?: never;
          is_best_seller?: boolean;
          is_gift_for_her?: boolean;
          is_hero?: boolean;
          is_new_arrival?: boolean;
          is_published?: boolean;
          materials?: string[];
          merch_position?: number | null;
          name?: string;
          new_arrival_position?: number | null;
          price?: number | null;
          published_at?: string | null;
          search_vector?: unknown;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          slug?: string;
          stock_qty?: number;
          stones?: string[];
          styles?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      search_misses: {
        Row: {
          count: number;
          first_seen: string;
          last_seen: string;
          term: string;
        };
        Insert: {
          count?: number;
          first_seen?: string;
          last_seen?: string;
          term: string;
        };
        Update: {
          count?: number;
          first_seen?: string;
          last_seen?: string;
          term?: string;
        };
        Relationships: [];
      };
      shipping_rules: {
        Row: {
          est_days_max: number;
          est_days_min: number;
          free_above: number | null;
          id: number;
          is_active: boolean;
          match_type: Database["public"]["Enums"]["shipping_match_type"];
          match_value: string | null;
          name: string;
          priority: number;
          rate: number;
        };
        Insert: {
          est_days_max?: number;
          est_days_min?: number;
          free_above?: number | null;
          id?: never;
          is_active?: boolean;
          match_type: Database["public"]["Enums"]["shipping_match_type"];
          match_value?: string | null;
          name: string;
          priority?: number;
          rate: number;
        };
        Update: {
          est_days_max?: number;
          est_days_min?: number;
          free_above?: number | null;
          id?: never;
          is_active?: boolean;
          match_type?: Database["public"]["Enums"]["shipping_match_type"];
          match_value?: string | null;
          name?: string;
          priority?: number;
          rate?: number;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          announcement_text: string | null;
          brand_story_cta_label: string | null;
          brand_story_cta_url: string | null;
          brand_story_highlight: string | null;
          brand_story_text: string | null;
          business_address: string | null;
          business_hours: string | null;
          business_name: string;
          gst_rate: number;
          gstin: string | null;
          id: number;
          instagram_url: string | null;
          invoice_prefix: string;
          low_stock_threshold: number;
          prices_include_gst: boolean;
          support_email: string | null;
          support_phone: string | null;
          updated_at: string;
          whatsapp_number: string | null;
        };
        Insert: {
          announcement_text?: string | null;
          brand_story_cta_label?: string | null;
          brand_story_cta_url?: string | null;
          brand_story_highlight?: string | null;
          brand_story_text?: string | null;
          business_address?: string | null;
          business_hours?: string | null;
          business_name?: string;
          gst_rate?: number;
          gstin?: string | null;
          id?: number;
          instagram_url?: string | null;
          invoice_prefix?: string;
          low_stock_threshold?: number;
          prices_include_gst?: boolean;
          support_email?: string | null;
          support_phone?: string | null;
          updated_at?: string;
          whatsapp_number?: string | null;
        };
        Update: {
          announcement_text?: string | null;
          brand_story_cta_label?: string | null;
          brand_story_cta_url?: string | null;
          brand_story_highlight?: string | null;
          brand_story_text?: string | null;
          business_address?: string | null;
          business_hours?: string | null;
          business_name?: string;
          gst_rate?: number;
          gstin?: string | null;
          id?: number;
          instagram_url?: string | null;
          invoice_prefix?: string;
          low_stock_threshold?: number;
          prices_include_gst?: boolean;
          support_email?: string | null;
          support_phone?: string | null;
          updated_at?: string;
          whatsapp_number?: string | null;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          author_name: string;
          id: number;
          is_active: boolean;
          location: string | null;
          quote: string;
          sort_order: number;
        };
        Insert: {
          author_name: string;
          id?: never;
          is_active?: boolean;
          location?: string | null;
          quote: string;
          sort_order?: number;
        };
        Update: {
          author_name?: string;
          id?: never;
          is_active?: boolean;
          location?: string | null;
          quote?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      analytics_by_category: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string };
        Returns: {
          category: string;
          category_id: number;
          revenue: number;
          units: number;
        }[];
      };
      analytics_by_location: {
        Args: { p_from: string; p_include_test?: boolean; p_level?: string; p_to: string };
        Returns: {
          city: string;
          orders: number;
          revenue: number;
          state: string;
        }[];
      };
      analytics_gift_cards: { Args: { p_from: string; p_include_test?: boolean; p_to: string }; Returns: Json };
      analytics_guard: { Args: Record<PropertyKey, never>; Returns: undefined };
      analytics_low_stock: {
        Args: { p_include_test?: boolean; p_threshold?: number };
        Returns: {
          days_left: number;
          name: string;
          product_id: number;
          sold_30d: number;
          stock: number;
          variant_label: string;
        }[];
      };
      analytics_product_sales: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string };
        Returns: {
          family: string;
          image_path: string;
          name: string;
          product_id: number;
          revenue: number;
          units: number;
          variant_label: string;
        }[];
      };
      analytics_repeat_customers: {
        Args: { p_from: string; p_include_test?: boolean; p_limit?: number; p_to: string };
        Returns: Json;
      };
      analytics_sales: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string };
        Returns: {
          access_token: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          country: string;
          courier_name: string | null;
          created_at: string;
          customer_name: string;
          email: string | null;
          gift_card_amount: number;
          gift_card_code: string | null;
          gift_note: string | null;
          gst_amount: number;
          id: string;
          idempotency_key: string | null;
          internal_notes: string | null;
          invoice_number: string | null;
          invoice_path: string | null;
          is_gift: boolean;
          is_test: boolean;
          landmark: string | null;
          order_number: string;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          phone: string;
          pincode: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          shipping_fee: number;
          state: string;
          status: Database["public"]["Enums"]["order_status"];
          stock_released_at: string | null;
          subtotal: number;
          total: number;
          tracking_number: string | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      analytics_sales_over_time: {
        Args: { p_bucket?: string; p_from: string; p_include_test?: boolean; p_to: string };
        Returns: {
          bucket: string;
          orders: number;
          revenue: number;
        }[];
      };
      analytics_summary: { Args: { p_from: string; p_include_test?: boolean; p_to: string }; Returns: Json };
      assign_invoice_number: { Args: { p_order_id: string }; Returns: string };
      confirm_payment: {
        Args: {
          p_amount: number;
          p_payment_id: string;
          p_razorpay_order_id: string;
          p_signature: string;
          p_source: string;
        };
        Returns: Json;
      };
      create_order: { Args: { payload: Json }; Returns: Json };
      expire_pending_orders: { Args: { p_older_than?: string }; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_search_miss: { Args: { p_term: string }; Returns: undefined };
      mark_payment_failed: {
        Args: { p_payment_id: string; p_razorpay_order_id: string; p_reason: string };
        Returns: undefined;
      };
      next_document_number: { Args: { p_kind: string; p_period: string }; Returns: number };
      pad_document_number: { Args: { n: number }; Returns: string };
      quote_shipping: {
        Args: { p_order_value: number; p_pincode: string; p_state: string };
        Returns: {
          est_days_max: number;
          est_days_min: number;
          fee: number;
          rule_id: number;
        }[];
      };
      reserve_order_stock: { Args: { p_order_id: string }; Returns: boolean };
      restore_stock: { Args: { p_order_id: string }; Returns: boolean };
      search_products: {
        Args: { p_limit?: number; p_offset?: number; q: string };
        Returns: {
          id: number;
          name: string;
          price: number;
          rank: number;
          slug: string;
          total: number;
        }[];
      };
    };
    Enums: {
      admin_role: "owner" | "staff";
      image_role: "worn_closeup" | "lifestyle" | "product_only" | "detail" | "flat_lay" | "video";
      order_event_type: "status_change" | "payment" | "note";
      order_status:
        | "pending_payment"
        | "placed"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
        | "refunded";
      payment_method: "razorpay" | "gift_card";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      relation_kind: "complete_the_look" | "cross_sell";
      shipping_match_type: "default" | "state" | "pincode_prefix";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ["owner", "staff"],
      image_role: ["worn_closeup", "lifestyle", "product_only", "detail", "flat_lay", "video"],
      order_event_type: ["status_change", "payment", "note"],
      order_status: [
        "pending_payment",
        "placed",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      payment_method: ["razorpay", "gift_card"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      relation_kind: ["complete_the_look", "cross_sell"],
      shipping_match_type: ["default", "state", "pincode_prefix"],
    },
  },
} as const;
