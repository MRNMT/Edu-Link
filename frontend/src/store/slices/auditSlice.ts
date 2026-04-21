import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { localApi } from "../../lib/localApi";

export interface AuditEntry {
  id: string;
  action: string;
  target: string | null;
  actor_id: string | null;
  actor_name?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  school_id?: string;
}
interface AuditState {
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  hasMore: boolean;
}
const initialState: AuditState = {
  entries: [],
  loading: false,
  error: null,
  page: 0,
  limit: 30,
  hasMore: true,
};

export const fetchAudit = createAsyncThunk(
  "audit/fetch",
  async (args: { limit?: number; page?: number } = {}, { rejectWithValue }) => {
    const limit = args.limit || 30;
    const page = args.page || 0;
    try {
      const response = await fetch(
        `${process.env.VITE_API_URL}/api/audit/logs?limit=${limit}&offset=${page * limit}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch audit logs");
    }
  },
);

export const appendAudit = createAsyncThunk(
  "audit/append",
  async (args: { limit?: number; page?: number }, { rejectWithValue }) => {
    const limit = args.limit || 30;
    const page = args.page || 0;
    try {
      const response = await fetch(
        `${process.env.VITE_API_URL}/api/audit/logs?limit=${limit}&offset=${page * limit}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load more audit logs");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to load more audit logs");
    }
  },
);

const slice = createSlice({
  name: "audit",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAudit.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchAudit.fulfilled, (s, a) => {
      s.loading = false;
      s.entries = a.payload;
      s.page = 0;
      s.hasMore = (a.payload as AuditEntry[]).length >= s.limit;
    });
    b.addCase(fetchAudit.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed to fetch audit logs";
    });
    b.addCase(appendAudit.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(appendAudit.fulfilled, (s, a) => {
      s.loading = false;
      (s.entries as AuditEntry[]).push(...(a.payload as AuditEntry[]));
      s.page += 1;
      s.hasMore = (a.payload as AuditEntry[]).length >= s.limit;
    });
    b.addCase(appendAudit.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || "Failed to load more audit logs";
    });
  },
});

export const { clearError } = slice.actions;
export default slice.reducer;
