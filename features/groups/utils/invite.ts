import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

export function groupInviteUrl(inviteCode: string): string {
  return Linking.createURL('/groups/join', {
    queryParams: { code: inviteCode.toUpperCase() },
  });
}

export async function shareGroupInvite(args: {
  groupName: string;
  inviteCode: string;
}): Promise<void> {
  const url = groupInviteUrl(args.inviteCode);
  const message = `Join ${args.groupName} on Jesus House Auburn.\nInvite code: ${args.inviteCode}\n${url}`;

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title: args.groupName, text: message, url });
    return;
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { message, url }
      : { message, title: `Join ${args.groupName}` },
  );
}

export async function copyText(value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  await Share.share({ message: value });
}
