import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { localApi } from "../../lib/localApi";

export interface PickupToken {
  id: string;
  child_id: string | null;
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
  fetching: boolean;
  verifying: boolean;
  error: string | null;
}
const initialState: PickupState = {
  tokens: [],
  generating: false,
  fetching: false,
  verifying: false,
  error: null,
};

export const generatePickupToken = createAsyncThunk(
  "pickup/generate",
  async (
    args: { childId: string; schoolId: string; userId: string; childName?: string },
    { rejectWithValue, getState },
  ) => {
    const state = getState() as {
      auth?: { profile?: { frozen_at?: string | null; frozen_reason?: string | null } | null };
    };
    const frozenAt = state.auth?.profile?.frozen_at;
    if (frozenAt) {
      const reason = state.auth?.profile?.frozen_reason;
      return rejectWithValue(
        reason ? `Account frozen: ${reason}` : "Account frozen by school admin",
      );
    }

    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    try {
      return await localApi.passes.create({
        child_id: args.childId,
        child_name: args.childName,
        token_kind: "qr",
        expires_at: expires,
      });
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to generate");
    }
  },
);

export const fetchMyTokens = createAsyncThunk("pickup/fetchMy", async (_, { rejectWithValue }) => {
  try {
    return (await localApi.passes.my()) as PickupToken[];
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch tokens");
  }
});

export const fetchSchoolTokens = createAsyncThunk(
  "pickup/fetchSchool",
  async (schoolId: string, { rejectWithValue }) => {
    try {
      return (await localApi.passes.school(schoolId)) as PickupToken[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch school tokens",
      );
    }
  },
);

export const verifyToken = createAsyncThunk(
  "pickup/verify",
  async (
    args: {
      code?: string;
      otp?: string;
      userId: string;
      schoolId: string;
      verdict: "approve" | "reject";
    },
    { rejectWithValue },
  ) => {
    try {
      return (await localApi.passes.verify({
        code: args.code,
        otp: args.otp,
        verdict: args.verdict,
      })) as PickupToken;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Verification failed");
    }
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
    b.addCase(fetchMyTokens.pending, (s) => {
      s.fetching = true;
      s.error = null;
    });
    b.addCase(fetchMyTokens.fulfilled, (s, a) => {
      s.fetching = false;
      s.tokens = a.payload;
    });
    b.addCase(fetchMyTokens.rejected, (s, a) => {
      s.fetching = false;
      s.error = (a.payload as string) || "Failed to fetch tokens";
    });
    b.addCase(fetchSchoolTokens.pending, (s) => {
      s.fetching = true;
      s.error = null;
    });
    b.addCase(fetchSchoolTokens.fulfilled, (s, a) => {
      s.fetching = false;
      s.tokens = a.payload;
    });
    b.addCase(fetchSchoolTokens.rejected, (s, a) => {
      s.fetching = false;
      s.error = (a.payload as string) || "Failed to fetch school tokens";
    });
    b.addCase(verifyToken.pending, (s) => {
      s.verifying = true;
      s.error = null;
    });
    b.addCase(verifyToken.fulfilled, (s, a) => {
      s.verifying = false;
      const idx = s.tokens.findIndex((t) => t.id === a.payload.id);
      if (idx >= 0) s.tokens[idx] = a.payload;
      else s.tokens.unshift(a.payload);
    });
    b.addCase(verifyToken.rejected, (s, a) => {
      s.verifying = false;
      s.error = (a.payload as string) || "Verification failed";
    });
  },
});

export const { clearPickupError } = slice.actions;
export default slice.reducer;
