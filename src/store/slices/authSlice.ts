import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "parent"
  | "teacher"
  | "school_admin"
  | "delegate"
  | "system_admin"
  | "gate_security";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  school_id: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  error: null,
};

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signInWithPassword(creds);
    if (error) return rejectWithValue(error.message);
    return data.session;
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await supabase.auth.signOut();
});

export const reauthenticateThunk = createAsyncThunk(
  "auth/reauth",
  async (password: string, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const email = state.auth.user?.email;
    if (!email) return rejectWithValue("No session");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return rejectWithValue("Incorrect password");
    return true;
  },
);

export const fetchProfileAndRoles = createAsyncThunk(
  "auth/fetchProfile",
  async (userId: string) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      profile: profile as Profile | null,
      roles: ((roles ?? []) as { role: AppRole }[]).map((r) => r.role),
    };
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      state.loading = false;
      if (!action.payload) {
        state.profile = null;
        state.roles = [];
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(loginThunk.fulfilled, (s, a) => {
      s.loading = false;
      s.session = a.payload;
      s.user = a.payload?.user ?? null;
    });
    b.addCase(loginThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Login failed";
    });
    b.addCase(logoutThunk.fulfilled, (s) => {
      s.session = null;
      s.user = null;
      s.profile = null;
      s.roles = [];
    });
    b.addCase(fetchProfileAndRoles.fulfilled, (s, a) => {
      s.profile = a.payload.profile;
      s.roles = a.payload.roles;
    });
  },
});

export const { setSession, clearError } = authSlice.actions;
export default authSlice.reducer;
