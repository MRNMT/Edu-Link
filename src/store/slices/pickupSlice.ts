import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/integrations/supabase/client";

export interface PickupToken {
  id: string;
  child_id: string;
  code: string;
  otp: string;
  status: "active" | "used" | "expired" | "rejected";
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
  kind: "qr" | "otp";
  child?: { full_name: string; class_name: string };
}

interface PickupState {
  tokens: PickupToken[];
  generating: boolean;
  error: string | null;
}
const initialState: PickupState = { tokens: [], generating: false, error: null };

function randomCode(len: number, alphabet: string) {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

export const generatePickupToken = createAsyncThunk(
  "pickup/generate",
  async (
    args: { childId: string; schoolId: string; userId: string },
    { rejectWithValue },
  ) => {
    const code = randomCode(24, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    const otp = randomCode(6, "0123456789");
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("pickup_tokens")
      .insert({
        child_id: args.childId,
        school_id: args.schoolId,
        issued_by: args.userId,
        code,
        otp,
        kind: "qr",
        expires_at: expires,
      })
      .select("*, child:children(full_name, class_name)")
      .single();
    if (error) return rejectWithValue(error.message);
    await supabase.from("audit_logs").insert({
      school_id: args.schoolId,
      actor_id: args.userId,
      action: "pickup_token.issued",
      target: data.id,
      metadata: { child_id: args.childId },
    });
    return data as PickupToken;
  },
);

export const fetchMyTokens = createAsyncThunk("pickup/fetchMy", async (userId: string) => {
  const { data, error } = await supabase
    .from("pickup_tokens")
    .select("*, child:children(full_name, class_name)")
    .eq("issued_by", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as PickupToken[];
});

export const fetchSchoolTokens = createAsyncThunk(
  "pickup/fetchSchool",
  async (schoolId: string) => {
    const { data, error } = await supabase
      .from("pickup_tokens")
      .select("*, child:children(full_name, class_name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as PickupToken[];
  },
);

export const verifyToken = createAsyncThunk(
  "pickup/verify",
  async (
    args: { code?: string; otp?: string; userId: string; schoolId: string; verdict: "approve" | "reject" },
    { rejectWithValue },
  ) => {
    const q = supabase.from("pickup_tokens").select("*, child:children(full_name, class_name)");
    const { data: tokens, error: fetchErr } = args.code
      ? await q.eq("code", args.code).limit(1)
      : await q.eq("otp", args.otp!).eq("school_id", args.schoolId).order("created_at", { ascending: false }).limit(1);
    if (fetchErr) return rejectWithValue(fetchErr.message);
    const token = tokens?.[0];
    if (!token) return rejectWithValue("Token not found");

    const expired = new Date(token.expires_at).getTime() < Date.now();
    let newStatus: PickupToken["status"];
    if (token.status !== "active") newStatus = token.status;
    else if (expired) newStatus = "expired";
    else if (args.verdict === "approve") newStatus = "used";
    else newStatus = "rejected";

    const { data: updated, error: updErr } = await supabase
      .from("pickup_tokens")
      .update({
        status: newStatus,
        used_at: newStatus === "used" || newStatus === "rejected" ? new Date().toISOString() : null,
        used_by: args.userId,
      })
      .eq("id", token.id)
      .select("*, child:children(full_name, class_name)")
      .single();
    if (updErr) return rejectWithValue(updErr.message);

    await supabase.from("audit_logs").insert({
      school_id: args.schoolId,
      actor_id: args.userId,
      action: `pickup_token.${newStatus}`,
      target: token.id,
      metadata: { verdict: args.verdict, child_id: token.child_id },
    });
    return updated as PickupToken;
  },
);

const slice = createSlice({
  name: "pickup",
  initialState,
  reducers: {
    clearPickupError(s) {
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(generatePickupToken.pending, (s) => {
      s.generating = true;
      s.error = null;
    });
    b.addCase(generatePickupToken.fulfilled, (s, a) => {
      s.generating = false;
      s.tokens.unshift(a.payload);
    });
    b.addCase(generatePickupToken.rejected, (s, a) => {
      s.generating = false;
      s.error = (a.payload as string) || "Failed to generate";
    });
    b.addCase(fetchMyTokens.fulfilled, (s, a) => {
      s.tokens = a.payload;
    });
    b.addCase(fetchSchoolTokens.fulfilled, (s, a) => {
      s.tokens = a.payload;
    });
    b.addCase(verifyToken.fulfilled, (s, a) => {
      const idx = s.tokens.findIndex((t) => t.id === a.payload.id);
      if (idx >= 0) s.tokens[idx] = a.payload;
      else s.tokens.unshift(a.payload);
    });
    b.addCase(verifyToken.rejected, (s, a) => {
      s.error = (a.payload as string) || "Verification failed";
    });
  },
});

export const { clearPickupError } = slice.actions;
export default slice.reducer;
