import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "./authSlice";

interface RoleState {
  activeRole: AppRole | null;
}
const initialState: RoleState = { activeRole: null };

const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setActiveRole(state, action: PayloadAction<AppRole | null>) {
      state.activeRole = action.payload;
    },
  },
});

export const { setActiveRole } = roleSlice.actions;
export default roleSlice.reducer;
