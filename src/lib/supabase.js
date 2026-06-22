import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://gastofrxtkkjpcgthrru.supabase.co'
export const supabaseAnonKey = 'sb_publishable_ksUf8-xWBQoJFC_HwNq2xw_aXrTwMS2'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
