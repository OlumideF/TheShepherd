/**
 * Brand constants for the Jesus House Auburn member app.
 */

export const brand = {
  appName: 'Jesus House Auburn',
  congregationName: 'Jesus House Auburn',
  denomination: 'RCCG',
  social: {
    youtube: {
      handle: '@rccgauburn',
      url: 'https://www.youtube.com/@rccgauburn',
      /** Channel ID for live_stream embeds */
      channelId: 'UCHkhJ6h23vTbUW8SZMW5OvQ',
      liveUrl: 'https://www.youtube.com/@rccgauburn/live',
    },
    instagram: {
      handle: '@rccgauburn',
      name: 'RCCG Jesus House Auburn',
      url: 'https://www.instagram.com/rccgauburn/',
    },
    facebook: {
      url: 'https://www.facebook.com/profile.php?id=61555660897851',
    },
  },
  /**
   * Typical Sunday live window (America/Chicago — Auburn, AL).
   * More precise scheduling can be added later via programmed media_items.
   */
  liveSchedule: {
    timeZone: 'America/Chicago',
    weekday: 0, // Sunday
    startHour: 8,
    startMinute: 40,
    endHour: 12,
    endMinute: 0,
    label: 'Sundays, 8:40 AM – 12:00 PM (Central)',
  },
} as const;
