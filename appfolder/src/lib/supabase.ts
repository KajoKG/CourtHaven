'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Klijentski Supabase klijent koji održava auth cookie (potrebno za API rute)
export const supabase = createClientComponentClient();
