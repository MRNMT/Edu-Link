import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { localApi, setStoredToken } from "../../lib/localApi";

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
  frozen_at?: string | null;
  frozen_by?: string | null;
  frozen_reason?: string | null;
}

interface LocalUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  school_id: string | null;
}

interface LocalSession {
  access_token: string;
  user: LocalUser;
  profile: Profile;
  roles: AppRole[];
}

interface AuthState {
  session: LocalSession | null;
  user: LocalUser | null;
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
    try {
      const session = await localApi.auth.login(creds.email, creds.password);
      setStoredToken(session.access_token);
      return session;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Login failed");
    }
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await localApi.auth.logout();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Logout failed");
  } finally {
    setStoredToken(null);
  }
});

export const reauthenticateThunk = createAsyncThunk(
  "auth/reauth",
  async (password: string, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const email = state.auth.user?.email;
    if (!email) return rejectWithValue("No session");
    try {
      const session = await localApi.auth.login(email, password);
      setStoredToken(session.access_token);
      return session;
    } catch {
      return rejectWithValue("Incorrect password");
    }
  },
);

export const fetchProfileAndRoles = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const session = await localApi.auth.me();
      setStoredToken(session.access_token);
      return session;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch profile");
    }
  },
);

export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async (data: { full_name?: string; phone?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.VITE_API_URL}/api/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const session = await response.json();
      return session;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Update failed");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<LocalSession | null>) {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      state.profile = action.payload?.profile ?? null;
      state.roles = action.payload?.roles ?? [];
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
      s.user = a.payload.user;
      s.profile = a.payload.profile;
      s.roles = a.payload.roles;
    });
    b.addCase(loginThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Login failed";
    });
    b.addCase(logoutThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(logoutThunk.fulfilled, (s) => {
      s.session = null;
      s.user = null;
      s.profile = null;
      s.roles = [];
      s.loading = false;
    });
    b.addCase(logoutThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Logout failed";
    });
    b.addCase(reauthenticateThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(reauthenticateThunk.fulfilled, (s, a) => {
      s.loading = false;
      s.session = a.payload;
      s.user = a.payload.user;
      s.profile = a.payload.profile;
      s.roles = a.payload.roles;
    });
    b.addCase(reauthenticateThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Re-authentication failed";
    });
    b.addCase(fetchProfileAndRoles.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchProfileAndRoles.fulfilled, (s, a) => {
      s.loading = false;
      s.session = a.payload;
      s.user = a.payload.user;
      s.profile = a.payload.profile;
      s.roles = a.payload.roles;
    });
    b.addCase(fetchProfileAndRoles.rejected, (s, a) => {
      s.loading = false;
      s.session = null;
      s.user = null;
      s.profile = null;
      s.roles = [];
      s.error = (a.payload as string) || "Failed to fetch profile";
    });
    b.addCase(updateProfileThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(updateProfileThunk.fulfilled, (s, a) => {
      s.loading = false;
      s.session = a.payload;
      s.user = a.payload.user;
      s.profile = a.payload.profile;
      s.roles = a.payload.roles;
    });
    b.addCase(updateProfileThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Profile update failed";
    });
  },
});

export const { setSession, clearError } = authSlice.actions;
export default authSlice.reducer;
