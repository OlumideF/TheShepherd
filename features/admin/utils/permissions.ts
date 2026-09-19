import { SUPER_ADMIN_EMAIL, type Profile, type UserRole } from '@/lib/supabase/types';

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isSuperAdmin(profile: Profile | null | undefined): boolean {
  return isSuperAdminEmail(profile?.email);
}

export function canAccessAdminHub(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin';
}

export function canPublishMedia(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return (
    profile.role === 'admin' ||
    profile.role === 'group_leader' ||
    profile.can_upload_media === true
  );
}

export function canAssignAdminRole(actor: Profile | null | undefined): boolean {
  return isSuperAdmin(actor);
}

/** Roles the actor may assign to a target profile. */
export function assignableRoles(
  actor: Profile | null | undefined,
  target: Profile | null | undefined,
): UserRole[] {
  if (!actor || actor.role !== 'admin') return [];
  if (isSuperAdmin(target) || (target && isSuperAdminEmail(target.email))) {
    return ['admin'];
  }
  if (isSuperAdmin(actor)) {
    return ['member', 'group_leader', 'admin'];
  }
  if (target?.role === 'admin') {
    return ['admin'];
  }
  return ['member', 'group_leader'];
}
