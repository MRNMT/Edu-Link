import { createSlice } from "@reduxjs/toolkit";

interface ChildModeState {
  active: boolean;
  // unlock counter — bumps each time exit auth succeeds
  unlockTick: number;
}
const initialState: ChildModeState = { active: false, unlockTick: 0 };

const slice = createSlice({
  name: "childMode",
  initialState,
  reducers: {
    enterChildMode(state) {
      state.active = true;
    },
    exitChildMode(state) {
      state.active = false;
      state.unlockTick += 1;
    },
  },
});

export const { enterChildMode, exitChildMode } = slice.actions;
export default slice.reducer;
