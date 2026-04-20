import { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "@/store";
import { fetchProfileAndRoles, setSession } from "@/store/slices/authSlice";
import { setActiveRole } from "@/store/slices/roleSlice";
import { supabase } from "@/integrations/supabase/client";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // 1) Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
      if (session?.user) {
        // defer to avoid deadlock per Supabase guidance
        setTimeout(() => {
          dispatch(fetchProfileAndRoles(session.user.id)).then((res) => {
            const roles = (res.payload as { roles: string[] } | undefined)?.roles ?? [];
            if (roles[0]) dispatch(setActiveRole(roles[0] as never));
          });
        }, 0);
      } else {
        dispatch(setActiveRole(null));
      }
    });

    // 2) Then existing session
    supabase.auth.getSession().then(({ data }) => {
      dispatch(setSession(data.session));
      if (data.session?.user) {
        dispatch(fetchProfileAndRoles(data.session.user.id)).then((res) => {
          const roles = (res.payload as { roles: string[] } | undefined)?.roles ?? [];
          if (roles[0]) dispatch(setActiveRole(roles[0] as never));
        });
      }
    });

    return () => sub.subscription.unsubscribe();
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
