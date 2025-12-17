/**
 * fetch-user-count.js
 * 
 * Fetches the actual user count from Supabase and sets it as an environment variable
 * for the prebuild script to use.
 * 
 * Usage: 
 *   node scripts/fetch-user-count.js
 * 
 * Requires environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Service role key (for server-side access)
 * 
 * The script outputs the count which can be captured:
 *   export SKYSTATUS_USER_COUNT=$(node scripts/fetch-user-count.js)
 *   npm run build
 * 
 * Or use in GitHub Actions:
 *   - run: echo "SKYSTATUS_USER_COUNT=$(node scripts/fetch-user-count.js)" >> $GITHUB_ENV
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchUserCount() {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching user count:', error.message);
      process.exit(1);
    }
    
    // Output just the number for easy capture
    console.log(count);
    
  } catch (err) {
    console.error('Failed to connect to Supabase:', err.message);
    process.exit(1);
  }
}

fetchUserCount();
