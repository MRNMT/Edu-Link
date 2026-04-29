import { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "@/store";
import { fetchProfileAndRoles, setSession } from "@/store/slices/authSlice";
import { setActiveRole } from "@/store/slices/roleSlice";
import { getStoredToken, setStoredToken } from "../lib/localApi";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      dispatch(setSession(null));
      dispatch(setActiveRole({ role: null }));
      return;
    }

    dispatch(fetchProfileAndRoles())
      .unwrap()
      .then((session) => {
        dispatch(setSession(session));
        if (session.roles[0]) dispatch(setActiveRole({ role: session.roles[0] }));
      })
      .catch(() => {
        setStoredToken(null);
        dispatch(setSession(null));
        dispatch(setActiveRole({ role: null }));
      });
  }, [dispatch]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </Provider>
  );
}
