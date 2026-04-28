import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "./authSlice";

interface RoleState {
  activeRole: AppRole | null;
  previousRole: AppRole | null;
  switched_at: number | null;
}
const initialState: RoleState = { activeRole: null, previousRole: null, switched_at: null };

const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setActiveRole(
      state,
      action: PayloadAction<{ role: AppRole | null; availableRoles?: AppRole[] }>,
    ) {
      const { role, availableRoles } = action.payload;

      // Validate role is in available roles if specified
      if (role && availableRoles && !availableRoles.includes(role)) {
        console.warn(`Role ${role} not in available roles:`, availableRoles);
        return;
      }

      if (role !== state.activeRole) {
        state.previousRole = state.activeRole;
        state.activeRole = role;
        state.switched_at = Date.now();
      }
    },
    resetRole(state) {
      state.activeRole = null;
      state.previousRole = null;
      state.switched_at = null;
    },
  },
});

export const { setActiveRole, resetRole } = roleSlice.actions;
export default roleSlice.reducer;
