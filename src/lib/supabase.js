import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gastofrxtkkjpcgthrru.supabase.co'
const supabaseAnonKey = 'sb_publishable_ksUf8-xWBQoJFC_HwNq2xw_aXrTwMS2'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
