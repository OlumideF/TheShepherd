import { SUPER_ADMIN_EMAIL, type Profile, type UserRole } from '@/lib/supabase/types';

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

/** True if profile email or auth session email is the congregation super admin. */
export function isSuperAdmin(
  profile: Profile | null | undefined,
  authEmail?: string | null,
): boolean {
  return isSuperAdminEmail(profile?.email) || isSuperAdminEmail(authEmail);
}

export function canAccessAdminHub(
  profile: Profile | null | undefined,
  authEmail?: string | null,
): boolean {
  return profile?.role === 'admin' || isSuperAdmin(profile, authEmail);
}

export function canPublishMedia(
  profile: Profile | null | undefined,
  authEmail?: string | null,
): boolean {
  if (isSuperAdmin(profile, authEmail)) return true;
  if (!profile) return false;
  return (
    profile.role === 'admin' ||
    profile.role === 'group_leader' ||
    profile.can_upload_media === true
  );
}

export function canAssignAdminRole(
  actor: Profile | null | undefined,
  authEmail?: string | null,
): boolean {
  return isSuperAdmin(actor, authEmail);
}

/** Roles the actor may assign to a target profile. */
export function assignableRoles(
  actor: Profile | null | undefined,
  target: Profile | null | undefined,
  authEmail?: string | null,
): UserRole[] {
  if (!actor || !canAccessAdminHub(actor, authEmail)) return [];
  if (isSuperAdmin(target) || (target && isSuperAdminEmail(target.email))) {
    return ['admin'];
  }
  if (isSuperAdmin(actor, authEmail)) {
    return ['member', 'group_leader', 'admin'];
  }
  if (target?.role === 'admin') {
    return ['admin'];
  }
  return ['member', 'group_leader'];
}
