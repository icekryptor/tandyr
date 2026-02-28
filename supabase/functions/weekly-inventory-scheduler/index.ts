// Supabase Edge Function: weekly-inventory-scheduler
//
// Two cron jobs (set up in Supabase Dashboard > Edge Functions > Schedules):
//   1. "0 8 * * 0"  — Sunday  08:00 UTC: create inventory_acts for all stores
//   2. "0 0 * * 1"  — Monday  00:00 UTC: mark uncompleted acts as 'overdue'
//
// Invoke with body { action: 'create' } or { action: 'mark_overdue' }
// When called without a body (e.g. from cron), the action is inferred from current day.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildMessages, sendPushBatch } from '../_shared/push.ts';

function getISOWeekAndYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/** Compute the Sunday date (YYYY-MM-DD) for a given ISO week */
function getSundayOfWeek(week: number, year: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const isoWeek1Monday = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  const targetMonday = new Date(isoWeek1Monday.getTime() + (week - 1) * 7 * 86400000);
  const sunday = new Date(targetMonday.getTime() + 6 * 86400000);
  return sunday.toISOString().slice(0, 10);
}

async function createWeeklyActs(supabase: ReturnType<typeof createClient>): Promise<string> {
  const now = new Date();
  const { week, year } = getISOWeekAndYear(now);
  const scheduledDate = getSundayOfWeek(week, year);

  // Get all stores (no is_active filter — stores table has no such column)
  const { data: stores, error: storesErr } = await supabase
    .from('stores')
    .select('id, name');

  if (storesErr) throw new Error(`Failed to fetch stores: ${storesErr.message}`);
  if (!stores?.length) return 'No stores found';

  // For each store, find a baker assigned via user_stores
  const actsToInsert: Array<{
    store_id: string;
    user_id: string | null;
    week_year: number;
    week_number: number;
    scheduled_date: string;
    status: string;
  }> = [];

  for (const store of stores) {
    // Look up baker via user_stores + company_role (not role)
    const { data: assignments } = await supabase
      .from('user_stores')
      .select('user_id, users!inner(id, company_role)')
      .eq('store_id', store.id)
      .eq('users.company_role', 'baker')
      .limit(1);

    const userId = assignments?.[0]?.user_id ?? null;

    actsToInsert.push({
      store_id: store.id,
      user_id: userId,
      week_year: year,          // INTEGER, not string
      week_number: week,
      scheduled_date: scheduledDate,
      status: 'pending',
    });
  }

  // Filter out acts without a user_id (user_id is NOT NULL in the table)
  const validActs = actsToInsert.filter((a) => a.user_id !== null);

  if (validActs.length === 0) {
    return `No bakers assigned to stores — cannot create acts for week ${week}/${year}`;
  }

  // Upsert — ignore conflicts for existing acts
  const { data: inserted, error: insertErr } = await supabase
    .from('inventory_acts')
    .upsert(validActs, { onConflict: 'store_id,week_year,week_number', ignoreDuplicates: true })
    .select('id, store_id, user_id');

  if (insertErr) throw new Error(`Failed to insert acts: ${insertErr.message}`);

  // Notify assigned bakers
  const assignedUserIds = [...new Set(
    (inserted ?? []).map((a: any) => a.user_id).filter(Boolean) as string[],
  )];

  if (assignedUserIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('push_token')
      .in('id', assignedUserIds)
      .not('push_token', 'is', null);

    if (users?.length) {
      const messages = buildMessages(
        users as any[],
        '📋 Инвентаризация',
        `Проведите инвентаризацию склада за неделю ${week}/${year}`,
        { screen: 'inventory-act' },
      );
      await sendPushBatch(messages);
    }
  }

  const count = (inserted ?? []).length;
  return `Created ${count} inventory acts for week ${week}/${year}`;
}

async function markOverdueActs(supabase: ReturnType<typeof createClient>): Promise<string> {
  const now = new Date();
  const { week, year } = getISOWeekAndYear(now);

  // Previous week — handle week 53 correctly
  let prevWeek = week - 1;
  let prevYear = year;
  if (prevWeek < 1) {
    prevYear -= 1;
    // Compute last week of previous year dynamically
    const dec28 = new Date(Date.UTC(prevYear, 11, 28));
    const { week: lastWeek } = getISOWeekAndYear(dec28);
    prevWeek = lastWeek; // 52 or 53
  }

  // Mark all pending acts from last week as overdue
  // week_year is INTEGER in the DB
  const { data: updated, error } = await supabase
    .from('inventory_acts')
    .update({ status: 'overdue' })
    .eq('week_year', prevYear)
    .eq('week_number', prevWeek)
    .eq('status', 'pending')
    .select('id, store_id, user_id');

  if (error) throw new Error(`Failed to mark overdue: ${error.message}`);

  const count = (updated ?? []).length;

  // Notify admins/managers about overdue acts
  // Use company_role (not role) for owner/manager
  if (count > 0) {
    const { data: admins } = await supabase
      .from('users')
      .select('push_token')
      .in('company_role', ['admin', 'owner', 'manager'])
      .not('push_token', 'is', null);

    if (admins?.length) {
      const messages = buildMessages(
        admins as any[],
        '⚠️ Просроченные акты',
        `${count} магазин(а) не сдали инвентаризацию за неделю ${prevWeek}/${prevYear}`,
        { screen: 'inventory' },
      );
      await sendPushBatch(messages);
    }
  }

  return `Marked ${count} acts as overdue for week ${prevWeek}/${prevYear}`;
}

Deno.serve(async (req) => {
  let action: 'create' | 'mark_overdue' | null = null;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.action === 'create' || body.action === 'mark_overdue') {
        action = body.action;
      }
    } catch {
      // ignore parse errors — infer from day
    }
  }

  if (!action) {
    const dayOfWeek = new Date().getUTCDay();
    if (dayOfWeek === 0) action = 'create';
    else if (dayOfWeek === 1) action = 'mark_overdue';
    else {
      return new Response(
        JSON.stringify({ error: 'Cannot infer action: not Sunday or Monday. Pass { action } explicitly.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const message = action === 'create'
      ? await createWeeklyActs(supabase)
      : await markOverdueActs(supabase);

    return new Response(
      JSON.stringify({ action, message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
