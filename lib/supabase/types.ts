export type UserRole = 'member' | 'group_leader' | 'admin';
export type MembershipStatus = 'visitor' | 'pending' | 'active' | 'inactive';

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
  created_at: string;
  updated_at: string;
};

export type Household = {
  id: string;
  name: string | null;
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
          created_at?: string;
        };
        Update: {
          name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
