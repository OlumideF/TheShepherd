export type UserRole = 'member' | 'group_leader' | 'admin';
export type MembershipStatus = 'visitor' | 'pending' | 'active' | 'inactive';
export type OnboardingIntent = 'visitor' | 'member';

export type Profile = {
  id: string;
  household_id: string | null;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  photo_url: string | null;
  membership_status: MembershipStatus;
  role: UserRole;
  directory_visible: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_photo: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DirectoryMember = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  membership_status: MembershipStatus;
  household_id: string | null;
};

export type Household = {
  id: string;
  name: string | null;
  invite_code: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          household_id?: string | null;
          email?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          photo_url?: string | null;
          membership_status?: MembershipStatus;
          role?: UserRole;
          directory_visible?: boolean;
          show_email?: boolean;
          show_phone?: boolean;
          show_photo?: boolean;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          household_id?: string | null;
          email?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          photo_url?: string | null;
          membership_status?: MembershipStatus;
          role?: UserRole;
          directory_visible?: boolean;
          show_email?: boolean;
          show_phone?: boolean;
          show_photo?: boolean;
          onboarding_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: Household;
        Insert: {
          id?: string;
          name?: string | null;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          invite_code?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      member_directory: {
        Row: DirectoryMember;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      my_household_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      complete_onboarding: {
        Args: { p_intent: string };
        Returns: Profile;
      };
      create_household: {
        Args: { p_name: string };
        Returns: Household;
      };
      join_household_by_code: {
        Args: { p_code: string };
        Returns: Household;
      };
      leave_household: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
