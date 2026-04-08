// src/db/seed.js
const bcrypt   = require('bcryptjs');
const { supabase } = require('./supabase');

// ── Admin env-var migration ───────────────────────────────────────────────────
// If ADMIN_EMAIL + ADMIN_PASSWORD_HASH are set (old Render env var style),
// auto-create the corresponding user row on first boot so no credentials are lost.
async function migrateAdminEnvVars() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const adminHash  = process.env.ADMIN_PASSWORD_HASH || '';
  if (!adminEmail || !adminHash) return;

  const { data: existing } = await supabase
    .from('users').select('id').eq('email', adminEmail).maybeSingle();
  if (existing) return; // already migrated

  const { error } = await supabase.from('users').insert({
    email:         adminEmail,
    password_hash: adminHash,
    name:          'Admin',
  });

  if (error) {
    console.error(JSON.stringify({ event: 'admin_migration_error', error: error.message }));
  } else {
    console.log(JSON.stringify({ event: 'admin_migrated', email: adminEmail }));
  }
}

// ── Default data ──────────────────────────────────────────────────────────────
async function seedDefaults() {
  try {
    await migrateAdminEnvVars();

    // Seed default leave types only on a completely fresh database
    const { count } = await supabase
      .from('leave_types')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      const { error } = await supabase.from('leave_types').insert([
        { name: 'Annual Leave', total: 21, used: 0, color: '#2563eb', order: 0 },
        { name: 'Sick Leave',   total: 14, used: 0, color: '#16a34a', order: 1 },
      ]);
      if (error) throw error;
      console.log(JSON.stringify({ event: 'seed', message: 'Default leave types created' }));
    }

    // Upsert default settings (ignoreDuplicates so existing values are preserved)
    const defaults = [
      { key: 'contractRenewal', value: '' },
      { key: 'lastResetDate',   value: '' },
      { key: 'onboarded',       value: 'false' },
    ];
    for (const d of defaults) {
      await supabase.from('settings').upsert(d, { onConflict: 'key', ignoreDuplicates: true });
    }
  } catch (err) {
    console.error(JSON.stringify({ event: 'seed_error', error: err.message }));
  }
}

module.exports = { seedDefaults };
