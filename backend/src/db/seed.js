// src/db/seed.js
const { supabase } = require('./supabase');

async function seedDefaults() {
  try {
    // Seed default leave types if none exist
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

    // Upsert default settings
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
