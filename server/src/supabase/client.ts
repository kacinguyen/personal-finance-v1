import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export function createServiceClient() {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
}
