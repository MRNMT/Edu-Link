import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import roleReducer from "./slices/roleSlice";
import childModeReducer from "./slices/childModeSlice";
import pickupReducer from "./slices/pickupSlice";
import auditReducer from "./slices/auditSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    role: roleReducer,
    childMode: childModeReducer,
    pickup: pickupReducer,
    audit: auditReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
