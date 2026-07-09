import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ivcnxkhhrjddfmeoxieo.supabase.co";
const supabaseAnonKey = "sb_publishable_EKxg-dGVrr6s4bHoQpPgXw_iAiSfX-R";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
