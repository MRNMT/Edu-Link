
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'parent',
  'teacher',
  'school_admin',
  'delegate',
  'system_admin',
  'gate_security'
);

CREATE TYPE public.token_kind AS ENUM ('qr', 'otp');
CREATE TYPE public.token_status AS ENUM ('active', 'used', 'expired', 'rejected');

-- ============================================================
-- TIMESTAMP TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'school_id')::uuid
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- USER ROLES (separate table to avoid privilege escalation)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, school_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id;
$$;

-- ============================================================
-- CHILDREN
-- ============================================================
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER children_updated_at BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PARENT-CHILD LINKS
-- ============================================================
CREATE TABLE public.parent_children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, child_id)
);
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PICKUP TOKENS
-- ============================================================
CREATE TABLE public.pickup_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  kind public.token_kind NOT NULL DEFAULT 'qr',
  code TEXT NOT NULL UNIQUE,
  otp TEXT NOT NULL,
  status public.token_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pickup_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pickup_tokens_school ON public.pickup_tokens (school_id, status);
CREATE INDEX idx_pickup_tokens_child ON public.pickup_tokens (child_id);

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_school ON public.audit_logs (school_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- SCHOOLS
CREATE POLICY "Authenticated can view schools"
  ON public.schools FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "System admin manages schools"
  ON public.schools FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- PROFILES
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "Same-school staff view profiles"
  ON public.profiles FOR SELECT
  TO authenticated USING (
    school_id = public.user_school_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'school_admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'gate_security')
    )
  );
CREATE POLICY "System admin views all profiles"
  ON public.profiles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- USER ROLES
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "School admin views school roles"
  ON public.user_roles FOR SELECT
  TO authenticated USING (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
  );
CREATE POLICY "System admin manages all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "School admin manages school roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
    AND role <> 'system_admin'
  )
  WITH CHECK (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
    AND role <> 'system_admin'
  );

-- CHILDREN
CREATE POLICY "Same-school staff view children"
  ON public.children FOR SELECT
  TO authenticated USING (
    school_id = public.user_school_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'school_admin')
      OR public.has_role(auth.uid(), 'gate_security')
    )
  );
CREATE POLICY "Parents view their children"
  ON public.children FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.child_id = children.id AND pc.parent_id = auth.uid()
    )
  );
CREATE POLICY "System admin views all children"
  ON public.children FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "School admin manages children"
  ON public.children FOR ALL
  TO authenticated
  USING (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
  )
  WITH CHECK (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
  );

-- PARENT-CHILD LINKS
CREATE POLICY "Parents view own links"
  ON public.parent_children FOR SELECT
  TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Same-school staff view links"
  ON public.parent_children FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = parent_children.child_id
        AND c.school_id = public.user_school_id(auth.uid())
        AND (
          public.has_role(auth.uid(), 'teacher')
          OR public.has_role(auth.uid(), 'school_admin')
          OR public.has_role(auth.uid(), 'gate_security')
        )
    )
  );
CREATE POLICY "School admin manages links"
  ON public.parent_children FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = parent_children.child_id
        AND c.school_id = public.user_school_id(auth.uid())
        AND public.has_role(auth.uid(), 'school_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = parent_children.child_id
        AND c.school_id = public.user_school_id(auth.uid())
        AND public.has_role(auth.uid(), 'school_admin')
    )
  );

-- PICKUP TOKENS
CREATE POLICY "Issuer views own tokens"
  ON public.pickup_tokens FOR SELECT
  TO authenticated USING (issued_by = auth.uid());
CREATE POLICY "Same-school staff view tokens"
  ON public.pickup_tokens FOR SELECT
  TO authenticated USING (
    school_id = public.user_school_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'school_admin')
      OR public.has_role(auth.uid(), 'gate_security')
    )
  );
CREATE POLICY "Parents create tokens for own children"
  ON public.pickup_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    issued_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'parent')
      OR public.has_role(auth.uid(), 'delegate')
    )
    AND EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.child_id = pickup_tokens.child_id AND pc.parent_id = auth.uid()
    )
  );
CREATE POLICY "Verifiers update tokens"
  ON public.pickup_tokens FOR UPDATE
  TO authenticated
  USING (
    school_id = public.user_school_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'gate_security')
      OR public.has_role(auth.uid(), 'school_admin')
    )
  );

-- AUDIT LOGS
CREATE POLICY "Anyone authenticated can append audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
CREATE POLICY "School admin views school audit"
  ON public.audit_logs FOR SELECT
  TO authenticated USING (
    school_id = public.user_school_id(auth.uid())
    AND public.has_role(auth.uid(), 'school_admin')
  );
CREATE POLICY "System admin views all audit"
  ON public.audit_logs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Users view own audit entries"
  ON public.audit_logs FOR SELECT
  TO authenticated USING (actor_id = auth.uid());
