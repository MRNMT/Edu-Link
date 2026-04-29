import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface ChildModeState {
  active: boolean;
  activeChildId: string | null;
  loading: boolean;
  error: string | null;
  // unlock counter — bumps each time exit auth succeeds
  unlockTick: number;
}
const initialState: ChildModeState = {
  active: false,
  activeChildId: null,
  loading: false,
  error: null,
  unlockTick: 0,
};

export const enterChildModeThunk = createAsyncThunk(
  "childMode/enter",
  async (args: { childId: string }, { rejectWithValue }) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const token =
        localStorage.getItem("guardian-link-access-token") || localStorage.getItem("auth_token");
      const response = await fetch(`${apiBaseUrl}/api/parents/me/child-mode/enter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ child_id: args.childId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to enter child mode");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Child mode entry failed");
    }
  },
);

export const exitChildModeThunk = createAsyncThunk(
  "childMode/exit",
  async (password: string, { rejectWithValue }) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const token =
        localStorage.getItem("guardian-link-access-token") || localStorage.getItem("auth_token");
      const response = await fetch(`${apiBaseUrl}/api/parents/me/child-mode/exit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to exit child mode");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Child mode exit failed");
    }
  },
);

const slice = createSlice({
  name: "childMode",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(enterChildModeThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(enterChildModeThunk.fulfilled, (s, a) => {
      s.loading = false;
      s.active = true;
      s.activeChildId = a.payload.child_id;
    });
    b.addCase(enterChildModeThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed to enter child mode";
    });
    b.addCase(exitChildModeThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(exitChildModeThunk.fulfilled, (s) => {
      s.loading = false;
      s.active = false;
      s.activeChildId = null;
      s.unlockTick += 1;
    });
    b.addCase(exitChildModeThunk.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed to exit child mode";
    });
  },
});

export const { clearError } = slice.actions;
export default slice.reducer;
