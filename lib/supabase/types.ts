export type UserRole = 'member' | 'group_leader' | 'admin';
export type MembershipStatus = 'visitor' | 'pending' | 'active' | 'inactive';
export type OnboardingIntent = 'visitor' | 'member';
export type AudioStatus = 'none' | 'processing' | 'ready';
export type MediaKind = 'sermon' | 'event' | 'other';
export type EventKind = 'service' | 'group' | 'special' | 'other';
export type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'waitlisted';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled';
export type GroupMemberStatus = 'pending' | 'approved';
export type GroupMemberRole = 'member' | 'leader';

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

export type ChurchGroup = {
  id: string;
  name: string;
  description: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  profile_id: string;
  status: GroupMemberStatus;
  role_in_group: GroupMemberRole;
  created_at: string;
};

export type ChurchEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: EventKind;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  rrule: string | null;
  capacity: number | null;
  group_id: string | null;
  created_by: string | null;
  reminder_offsets_minutes: number[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRsvp = {
  id: string;
  event_id: string;
  profile_id: string;
  occurrence_start: string;
  status: RsvpStatus;
  waitlist_position: number | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerSlot = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  slots_needed: number;
  created_at: string;
};

export type VolunteerSignup = {
  id: string;
  slot_id: string;
  profile_id: string;
  occurrence_start: string;
  created_at: string;
};

export type EventReminderQueueItem = {
  id: string;
  event_id: string;
  profile_id: string;
  occurrence_start: string;
  fire_at: string;
  offset_minutes: number;
  status: ReminderStatus;
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
        Relationships: [
          {
            foreignKeyName: 'photo_albums_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
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
      groups: {
        Row: ChurchGroup;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: GroupMember;
        Insert: {
          id?: string;
          group_id: string;
          profile_id: string;
          status?: GroupMemberStatus;
          role_in_group?: GroupMemberRole;
          created_at?: string;
        };
        Update: {
          status?: GroupMemberStatus;
          role_in_group?: GroupMemberRole;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: ChurchEvent;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          kind?: EventKind;
          location?: string | null;
          starts_at: string;
          ends_at?: string | null;
          timezone?: string;
          rrule?: string | null;
          capacity?: number | null;
          group_id?: string | null;
          created_by?: string | null;
          reminder_offsets_minutes?: number[];
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          kind?: EventKind;
          location?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          timezone?: string;
          rrule?: string | null;
          capacity?: number | null;
          group_id?: string | null;
          reminder_offsets_minutes?: number[];
          published?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      event_rsvps: {
        Row: EventRsvp;
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          occurrence_start: string;
          status: RsvpStatus;
          waitlist_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: RsvpStatus;
          waitlist_position?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_slots: {
        Row: VolunteerSlot;
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          description?: string | null;
          slots_needed?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          slots_needed?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_slots_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_signups: {
        Row: VolunteerSignup;
        Insert: {
          id?: string;
          slot_id: string;
          profile_id: string;
          occurrence_start: string;
          created_at?: string;
        };
        Update: {
          occurrence_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_signups_slot_id_fkey';
            columns: ['slot_id'];
            isOneToOne: false;
            referencedRelation: 'volunteer_slots';
            referencedColumns: ['id'];
          },
        ];
      };
      event_reminder_queue: {
        Row: EventReminderQueueItem;
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          occurrence_start: string;
          fire_at: string;
          offset_minutes: number;
          status?: ReminderStatus;
          created_at?: string;
        };
        Update: {
          status?: ReminderStatus;
          fire_at?: string;
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
      is_group_leader_role: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      leads_group: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      can_manage_event: {
        Args: { p_event_id: string };
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
      upsert_event_rsvp: {
        Args: {
          p_event_id: string;
          p_occurrence_start: string;
          p_status: RsvpStatus;
        };
        Returns: EventRsvp;
      };
      toggle_volunteer_signup: {
        Args: {
          p_slot_id: string;
          p_occurrence_start: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      membership_status: MembershipStatus;
      audio_status: AudioStatus;
      media_kind: MediaKind;
      event_kind: EventKind;
      rsvp_status: RsvpStatus;
      reminder_status: ReminderStatus;
      group_member_status: GroupMemberStatus;
      group_member_role: GroupMemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
