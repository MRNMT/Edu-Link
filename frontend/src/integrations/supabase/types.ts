export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          school_id: string | null;
          target: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          school_id?: string | null;
          target?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          school_id?: string | null;
          target?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      children: {
        Row: {
          class_name: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          category?: Database["public"]["Enums"]["notification_category"];
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          school_id: string;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          category?: Database["public"]["Enums"]["notification_category"];
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          school_id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_children: {
        Row: {
          child_id: string;
          created_at: string;
          id: string;
          parent_id: string;
          relationship: string;
        };
        Insert: {
          child_id: string;
          created_at?: string;
          id?: string;
          parent_id: string;
          relationship?: string;
        };
        Update: {
          child_id?: string;
          created_at?: string;
          id?: string;
          parent_id?: string;
          relationship?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_children_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_tokens: {
        Row: {
          child_id: string;
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          issued_by: string;
          kind: Database["public"]["Enums"]["token_kind"];
          otp: string;
          school_id: string;
          status: Database["public"]["Enums"]["token_status"];
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          child_id: string;
          code: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          issued_by: string;
          kind?: Database["public"]["Enums"]["token_kind"];
          otp: string;
          school_id: string;
          status?: Database["public"]["Enums"]["token_status"];
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          child_id?: string;
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_by?: string;
          kind?: Database["public"]["Enums"]["token_kind"];
          otp?: string;
          school_id?: string;
          status?: Database["public"]["Enums"]["token_status"];
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pickup_tokens_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pickup_tokens_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          frozen_at: string | null;
          frozen_by: string | null;
          frozen_reason: string | null;
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          school_id: string | null;
          updated_at: string;
        };
        Insert: {
          frozen_at?: string | null;
          frozen_by?: string | null;
          frozen_reason?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          school_id?: string | null;
          updated_at?: string;
        };
        Update: {
          frozen_at?: string | null;
          frozen_by?: string | null;
          frozen_reason?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          school_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          relationship: string | null;
          revoked_at: string | null;
          id?: string;
          parent_id: string;
          phone?: string | null;
          relationship?: string | null;
          revoked_at?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["delegate_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          delegate_name?: string;
          delegated_user_id?: string | null;
          id?: string;
          parent_id?: string;
          phone?: string | null;
          relationship?: string | null;
          revoked_at?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["delegate_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delegates_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      deletion_requests: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
          requested_by: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["deletion_request_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          requested_by: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["deletion_request_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          requested_by?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["deletion_request_status"];
        };
        Relationships: [
          {
            foreignKeyName: "deletion_requests_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      class_alerts: {
        Row: {
          class_name: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          message: string;
          priority: Database["public"]["Enums"]["class_alert_priority"];
          school_id: string;
          title: string;
        };
        Insert: {
          class_name: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          message: string;
          priority?: Database["public"]["Enums"]["class_alert_priority"];
          school_id: string;
          title: string;
        };
        Update: {
          class_name?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          message?: string;
          priority?: Database["public"]["Enums"]["class_alert_priority"];
          school_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_alerts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      user_school_id: { Args: { _user_id: string }; Returns: string };
    };
    Enums: {
      app_role:
        | "parent"
        | "teacher"
        | "school_admin"
        | "delegate"
        | "system_admin"
        | "gate_security";
      token_kind: "qr" | "otp";
      token_status: "active" | "used" | "expired" | "rejected";
      attendance_status: "present" | "absent" | "late" | "excused";
      delegate_status: "pending" | "approved" | "revoked";
      notification_category: "homework" | "class_alert" | "delegate" | "security" | "system";
      deletion_request_status: "pending" | "approved" | "rejected";
      class_alert_priority: "low" | "medium" | "high" | "critical";
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
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["parent", "teacher", "school_admin", "delegate", "system_admin", "gate_security"],
      token_kind: ["qr", "otp"],
      token_status: ["active", "used", "expired", "rejected"],
    },
  },
} as const;
