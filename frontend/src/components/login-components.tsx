import { Loader2 } from "lucide-react";

export const ROLE_EMAILS: Record<string, string> = {
  parent: "parent@demo.school",
  teacher: "teacher@demo.school",
  admin: "admin@demo.school",
  gate: "security@demo.school",
  delegate: "delegate@demo.school",
  sysadmin: "sysadmin@demo.school",
};

interface LoginFormProps {
  email: string;
  password: string;
  error: string | null;
  submitting: boolean;
  hydrated: boolean;
  loading: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenPasswordReset: () => void;
}

export function LoginForm({
  email,
  password,
  error,
  submitting,
  hydrated,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onOpenPasswordReset,
}: LoginFormProps) {
  return (
    <div className="login-panel">
      <div className="login-form-wrap">
        <div className="login-form-title">Welcome back</div>
        <div className="login-form-sub">Sign in to your EduSecure-Link dashboard</div>

        <form onSubmit={onSubmit}>
          <div className="fgroup">
            <label>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={onEmailChange}
              placeholder="user@edusecure-link.ac.za"
            />
          </div>

          <div className="fgroup">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={onPasswordChange}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!hydrated || submitting || loading}
            className="btn-login flex w-full items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Sign In to Dashboard →"
            )}
          </button>
        </form>

        <div className="login-foot">
          <span className="text-muted-foreground">Forgot password? </span>
          <button
            type="button"
            onClick={onOpenPasswordReset}
            className="text-blue-600 hover:text-blue-700 underline cursor-pointer"
          >
            Reset here
          </button>
        </div>
      </div>
    </div>
  );
}

interface LoginHeroProps {}

export function LoginHero({}: LoginHeroProps) {
  return (
    <div className="login-hero">
      <div className="hero-inner">
        <div className="hero-logo">
          <div className="hero-logo-img">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 4L6 10v10c0 9.2 6 17.4 14 20 8-2.6 14-10.8 14-20V10L20 4z"
                fill="rgba(255,255,255,0.15)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
              <circle cx="20" cy="17" r="5" fill="white" opacity="0.9" />
              <path
                d="M13 31c0-4 3.1-7 7-7s7 3.1 7 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M24 12l2 2-5 5"
                stroke="#26b8a8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="hero-logo-text">
            <div className="hero-logo-name">
              EduSecure-<span>Link</span>
            </div>
            <div className="hero-logo-tagline">Secure School Pickup & Operations Platform</div>
          </div>
        </div>

        <div className="hero-headline">
          Safe. Connected.
          <br />
          <span>Every Child, Every Day.</span>
        </div>

        <div className="hero-sub">
          A complete school operations platform that keeps children safe through verified pick-up
          protocols, delegate management, and real-time guardian communication.
        </div>

        <div className="hero-features">
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#26b8a8"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" />
              </svg>
            </div>
            QR-code & OTP verified child pick-up
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#26b8a8"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            Delegate guardian management with expiry
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#26b8a8"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            Real-time attendance & absence reporting
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#26b8a8"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            Child mode with grade-based learning portal
          </div>
        </div>
      </div>
    </div>
  );
}
