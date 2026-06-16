export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: { id: string; name: string; description: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; description?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; description?: string | null; created_at?: string; updated_at?: string };
      };
      users: {
        Row: {
          id: string;
          role_id: string;
          company_id: string | null;
          team_member_id: string | null;
          email: string;
          password_hash: string | null;
          display_name: string | null;
          status: Database["public"]["Enums"]["user_status"];
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          company_id?: string | null;
          team_member_id?: string | null;
          email: string;
          password_hash?: string | null;
          display_name?: string | null;
          status?: Database["public"]["Enums"]["user_status"];
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      company_settings: {
        Row: {
          id: string;
          company_name: string;
          company_subdomain: string | null;
          company_type: string | null;
          registration_number: string | null;
          tax_number: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          report_footer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          company_subdomain?: string | null;
          company_type?: string | null;
          registration_number?: string | null;
          tax_number?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          report_footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_settings"]["Insert"]>;
      };
      team_members: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          role_id: string;
          department: string | null;
          phone: string | null;
          email: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          full_name: string;
          role_id: string;
          department?: string | null;
          phone?: string | null;
          email: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      work_orders: {
        Row: {
          id: string;
          reference: string;
          kind: Database["public"]["Enums"]["work_order_kind"];
          title: string;
          domain_id: string;
          template_id: string;
          client_id: string;
          project_id: string;
          site_id: string | null;
          asset_id: string | null;
          priority: Database["public"]["Enums"]["priority"];
          status: Database["public"]["Enums"]["work_order_status"];
          due_date: string;
          description: string | null;
          scope: string | null;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["work_orders"]["Row"]> & {
          reference: string;
          kind: Database["public"]["Enums"]["work_order_kind"];
          title: string;
          domain_id: string;
          template_id: string;
          client_id: string;
          project_id: string;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_orders"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_status: "invited" | "active" | "suspended" | "disabled";
      work_order_kind: "CM" | "PM" | "Installation";
      work_order_status: "Scheduled" | "In Progress" | "On Hold" | "Completed" | "Cancelled";
      priority: "Critical" | "High" | "Medium" | "Low";
      checklist_result: "Unchecked" | "OK" | "Warning" | "Fail" | "N/A";
      report_status: "Draft" | "Submitted" | "Approved";
      system_status: "Optimal" | "Restricted" | "Offline";
      pm_status: "Planned" | "Due" | "Completed" | "Overdue" | "Skipped";
      pm_frequency: "Weekly" | "Monthly" | "Quarterly" | "Bi-Annual" | "Annual";
      pm_cell_status: "empty" | "scheduled" | "completed" | "issue" | "skipped";
      notification_type:
        | "work_order_assigned"
        | "work_order_due"
        | "work_order_overdue"
        | "pm_due"
        | "report_submitted"
        | "report_approved"
        | "invitation_sent"
        | "system";
      notification_priority: "info" | "warning" | "urgent";
    };
    CompositeTypes: Record<string, never>;
  };
};
