import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearError, loginThunk } from "@/store/slices/authSlice";
import { setActiveRole } from "@/store/slices/roleSlice";
import { roleHomePath } from "@/lib/roleRouting";
import { LoginForm, LoginHero, ROLE_EMAILS } from "@/components/login-components";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { session, roles, loading, error } = useAppSelector((s) => s.auth);

  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (session && roles.length > 0) {
      const r = roles[0];
      dispatch(setActiveRole({ role: r }));
      navigate({ to: roleHomePath(r) });
    }
  }, [session, roles, navigate, dispatch]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (newRole && ROLE_EMAILS[newRole]) {
      setEmail(ROLE_EMAILS[newRole]);
      setPassword("demo1234");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    dispatch(clearError());
    await dispatch(loginThunk({ email, password }));
    setSubmitting(false);
  };

  return (
    <div id="login-page" className="net-bg">
      <LoginHero />
      <LoginForm
        role={role}
        email={email}
        password={password}
        error={error}
        submitting={submitting}
        hydrated={hydrated}
        loading={loading}
        onRoleChange={handleRoleChange}
        onEmailChange={(e) => setEmail(e.target.value)}
        onPasswordChange={(e) => setPassword(e.target.value)}
        onSubmit={submit}
      />
    </div>
  );
}
