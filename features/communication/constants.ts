export const ANNOUNCEMENT_REACTION_EMOJIS = ['🙏', '❤️', '👍', '🎉', '🙌'] as const;

export type AnnouncementReactionEmoji = (typeof ANNOUNCEMENT_REACTION_EMOJIS)[number];
