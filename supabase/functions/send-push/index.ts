// Supabase Edge Function: materialize due event reminders + send Expo pushes.
// Deploy: `supabase functions deploy send-push`
// Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), optional EXPO_ACCESS_TOKEN for higher Expo rate limits.
// Invoke: after publishing announcements/broadcasts, or via cron every few minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type NotificationRow = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type PushTokenRow = {
  profile_id: string;
  token: string;
};

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Missing Supabase env' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Cron can use x-push-secret; app invokes with the user JWT (no secret needed).
    const expected = Deno.env.get('PUSH_FUNCTION_SECRET');
    const authHeader = req.headers.get('Authorization');
    if (expected && !authHeader) {
      const header = req.headers.get('x-push-secret');
      if (header !== expected) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    const { data: reminderCount, error: reminderError } = await supabase.rpc(
      'materialize_due_event_reminders',
      { p_limit: 100 },
    );
    if (reminderError) {
      return json({ error: reminderError.message }, 500);
    }

    const { data: pending, error: pendingError } = await supabase
      .from('notifications')
      .select('id, profile_id, title, body, data')
      .eq('push_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (pendingError) {
      return json({ error: pendingError.message }, 500);
    }

    const rows = (pending ?? []) as NotificationRow[];
    if (rows.length === 0) {
      return json({
        remindersMaterialized: reminderCount ?? 0,
        pushed: 0,
        skipped: 0,
      });
    }

    const profileIds = [...new Set(rows.map((r) => r.profile_id))];
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('profile_id, token')
      .in('profile_id', profileIds);

    if (tokenError) {
      return json({ error: tokenError.message }, 500);
    }

    const tokensByProfile = new Map<string, string[]>();
    for (const row of (tokens ?? []) as PushTokenRow[]) {
      const list = tokensByProfile.get(row.profile_id) ?? [];
      list.push(row.token);
      tokensByProfile.set(row.profile_id, list);
    }

    let pushed = 0;
    let skipped = 0;
    const messages: {
      to: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      sound: 'default';
    }[] = [];
    const sentIds: string[] = [];
    const skippedIds: string[] = [];

    for (const row of rows) {
      const profileTokens = tokensByProfile.get(row.profile_id) ?? [];
      if (profileTokens.length === 0) {
        skippedIds.push(row.id);
        skipped += 1;
        continue;
      }
      for (const token of profileTokens) {
        messages.push({
          to: token,
          title: row.title,
          body: row.body,
          data: { ...row.data, notification_id: row.id },
          sound: 'default',
        });
      }
      sentIds.push(row.id);
      pushed += 1;
    }

    if (messages.length > 0) {
      const expoHeaders: Record<string, string> = {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };
      const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
      if (expoToken) {
        expoHeaders.Authorization = `Bearer ${expoToken}`;
      }

      // Expo accepts batches up to 100.
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: expoHeaders,
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          const text = await res.text();
          return json({ error: `Expo push failed: ${text}` }, 502);
        }
      }
    }

    if (sentIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ push_status: 'sent' })
        .in('id', sentIds);
    }
    if (skippedIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ push_status: 'skipped' })
        .in('id', skippedIds);
    }

    return json({
      remindersMaterialized: reminderCount ?? 0,
      pushed,
      skipped,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
