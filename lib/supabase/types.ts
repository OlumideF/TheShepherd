export type UserRole = 'member' | 'group_leader' | 'admin';
export type MembershipStatus = 'visitor' | 'pending' | 'active' | 'inactive';
export type OnboardingIntent = 'visitor' | 'member';
export type AudioStatus = 'none' | 'processing' | 'ready';
export type MediaKind = 'sermon' | 'event' | 'other';

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

export type MediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  series: string | null;
  speaker: string | null;
  preached_at: string | null;
  topic: string | null;
  youtube_id: string | null;
  audio_file_path: string | null;
  audio_status: AudioStatus;
  duration_seconds: number | null;
  is_live: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type PhotoAlbum = {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  event_id: string | null;
  taken_on: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type ProfileInsert = {
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

type ProfileUpdate = {
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
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
      media_items: {
        Row: MediaItem;
        Insert: {
          id?: string;
          kind?: MediaKind;
          title: string;
          series?: string | null;
          speaker?: string | null;
          preached_at?: string | null;
          topic?: string | null;
          youtube_id?: string | null;
          audio_file_path?: string | null;
          audio_status?: AudioStatus;
          duration_seconds?: number | null;
          is_live?: boolean;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          kind?: MediaKind;
          title?: string;
          series?: string | null;
          speaker?: string | null;
          preached_at?: string | null;
          topic?: string | null;
          youtube_id?: string | null;
          audio_file_path?: string | null;
          audio_status?: AudioStatus;
          duration_seconds?: number | null;
          is_live?: boolean;
          published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      photo_albums: {
        Row: PhotoAlbum;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cover_path?: string | null;
          event_id?: string | null;
          taken_on?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          cover_path?: string | null;
          event_id?: string | null;
          taken_on?: string | null;
          published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: Photo;
        Insert: {
          id?: string;
          album_id: string;
          storage_path: string;
          caption?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          album_id?: string;
          storage_path?: string;
          caption?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_album_id_fkey';
            columns: ['album_id'];
            isOneToOne: false;
            referencedRelation: 'photo_albums';
            referencedColumns: ['id'];
          },
        ];
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
      audio_status: AudioStatus;
      media_kind: MediaKind;
    };
    CompositeTypes: Record<string, never>;
  };
};
