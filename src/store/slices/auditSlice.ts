import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  action: string;
  target: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
interface AuditState {
  entries: AuditEntry[];
  loading: boolean;
}
const initialState: AuditState = { entries: [], loading: false };

export const fetchAudit = createAsyncThunk("audit/fetch", async (limit: number = 30) => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditEntry[];
});

const slice = createSlice({
  name: "audit",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAudit.pending, (s) => {
      s.loading = true;
    });
    b.addCase(fetchAudit.fulfilled, (s, a) => {
      s.loading = false;
      s.entries = a.payload;
    });
  },
});

export default slice.reducer;
