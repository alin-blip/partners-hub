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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_card_settings: {
        Row: {
          accreditation: string | null
          apply_url: string | null
          bio: string | null
          booking_url: string | null
          company_description: string | null
          company_name: string | null
          created_at: string
          id: string
          is_public: boolean
          job_title: string | null
          social_facebook: string | null
          social_google: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_trustpilot: string | null
          social_youtube: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          working_hours: string | null
        }
        Insert: {
          accreditation?: string | null
          apply_url?: string | null
          bio?: string | null
          booking_url?: string | null
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          job_title?: string | null
          social_facebook?: string | null
          social_google?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_trustpilot?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          working_hours?: string | null
        }
        Update: {
          accreditation?: string | null
          apply_url?: string | null
          bio?: string | null
          booking_url?: string | null
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          job_title?: string | null
          social_facebook?: string | null
          social_google?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_trustpilot?: string | null
          social_youtube?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      agent_promotions: {
        Row: {
          agent_id: string
          id: string
          personal_deadline: string
          promotion_id: string
          started_at: string
        }
        Insert: {
          agent_id: string
          id?: string
          personal_deadline: string
          promotion_id: string
          started_at?: string
        }
        Update: {
          agent_id?: string
          id?: string
          personal_deadline?: string
          promotion_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          brand_prompt: string
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          brand_prompt?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          brand_prompt?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campuses: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          university_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          university_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          commission_per_student: number
          id: string
          max_students: number | null
          min_students: number
          tier_name: string
        }
        Insert: {
          commission_per_student?: number
          id?: string
          max_students?: number | null
          min_students?: number
          tier_name: string
        }
        Update: {
          commission_per_student?: number
          id?: string
          max_students?: number | null
          min_students?: number
          tier_name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          id: string
          level: string
          name: string
          study_mode: string
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          name: string
          study_mode?: string
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          name?: string
          study_mode?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          campus_id: string | null
          course_id: string
          created_at: string
          funding_notes: string | null
          funding_reference: string | null
          funding_status: string | null
          funding_type: string | null
          id: string
          intake_id: string | null
          notes: string | null
          status: string
          student_id: string
          university_id: string
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          course_id: string
          created_at?: string
          funding_notes?: string | null
          funding_reference?: string | null
          funding_status?: string | null
          funding_type?: string | null
          id?: string
          intake_id?: string | null
          notes?: string | null
          status?: string
          student_id: string
          university_id: string
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          course_id?: string
          created_at?: string
          funding_notes?: string | null
          funding_reference?: string | null
          funding_status?: string | null
          funding_type?: string | null
          id?: string
          intake_id?: string | null
          notes?: string | null
          status?: string
          student_id?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          image_path: string
          preset: string
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          preset?: string
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          preset?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      intakes: {
        Row: {
          application_deadline: string | null
          created_at: string
          id: string
          label: string
          start_date: string
          university_id: string
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string
          id?: string
          label: string
          start_date: string
          university_id: string
        }
        Update: {
          application_deadline?: string | null
          created_at?: string
          id?: string
          label?: string
          start_date?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intakes_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          bonus_amount: number
          bonus_percentage: number | null
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          id: string
          is_active: boolean
          target_role: string
          target_students: number
          title: string
        }
        Insert: {
          bonus_amount?: number
          bonus_percentage?: number | null
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          id?: string
          is_active?: boolean
          target_role?: string
          target_students?: number
          title: string
        }
        Update: {
          bonus_amount?: number
          bonus_percentage?: number | null
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          id?: string
          is_active?: boolean
          target_role?: string
          target_students?: number
          title?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          agent_id: string
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          student_id: string
          uploaded_by: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          doc_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          student_id: string
          uploaded_by?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          student_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string
          enrollment_id: string | null
          id: string
          is_agent_visible: boolean
          is_urgent: boolean
          note_type: string
          student_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_agent_visible?: boolean
          is_urgent?: boolean
          note_type?: string
          student_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_agent_visible?: boolean
          is_urgent?: boolean
          note_type?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          agent_id: string
          created_at: string
          crn: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          full_address: string | null
          gender: string | null
          id: string
          immigration_status: string | null
          last_name: string
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          ni_number: string | null
          notes: string | null
          phone: string | null
          previous_funding_years: number | null
          qualifications: string | null
          share_code: string | null
          study_pattern: string | null
          title: string | null
          uk_entry_date: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          crn?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          full_address?: string | null
          gender?: string | null
          id?: string
          immigration_status?: string | null
          last_name: string
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          ni_number?: string | null
          notes?: string | null
          phone?: string | null
          previous_funding_years?: number | null
          qualifications?: string | null
          share_code?: string | null
          study_pattern?: string | null
          title?: string | null
          uk_entry_date?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          crn?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          full_address?: string | null
          gender?: string | null
          id?: string
          immigration_status?: string | null
          last_name?: string
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          ni_number?: string | null
          notes?: string | null
          phone?: string | null
          previous_funding_years?: number | null
          qualifications?: string | null
          share_code?: string | null
          study_pattern?: string | null
          title?: string | null
          uk_entry_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_options: {
        Row: {
          created_at: string
          id: string
          label: string
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_options_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          timetable_available: boolean
          timetable_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          timetable_available?: boolean
          timetable_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          timetable_available?: boolean
          timetable_message?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "agent"
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
      app_role: ["owner", "admin", "agent"],
    },
  },
} as const
