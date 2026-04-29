
DO $$
DECLARE
  v_school_id uuid;
  v_user_id uuid;
  v_password_hash text := extensions.crypt('demo1234', extensions.gen_salt('bf'));
  r record;
  v_child_ids uuid[] := ARRAY[]::uuid[];
  v_cid uuid;
BEGIN
  INSERT INTO public.schools (name, code) VALUES ('Sentinel Academy', 'DEMO')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_school_id;

  FOR r IN
    SELECT * FROM (VALUES
      ('parent@demo.school', 'Pat Parker', 'parent'::public.app_role),
      ('teacher@demo.school', 'Tara Tan', 'teacher'::public.app_role),
      ('admin@demo.school', 'Adrian Hale', 'school_admin'::public.app_role),
      ('delegate@demo.school', 'Devon Kim', 'delegate'::public.app_role),
      ('sysadmin@demo.school', 'Sam Root', 'system_admin'::public.app_role),
      ('security@demo.school', 'Officer Vance', 'gate_security'::public.app_role)
    ) AS t(email, full_name, role)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = r.email;
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        r.email, v_password_hash, now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.full_name, 'school_id', v_school_id::text),
        false, false
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', r.email, 'email_verified', true),
        'email', v_user_id::text, now(), now(), now());
    END IF;
    UPDATE public.profiles SET full_name = r.full_name, school_id = v_school_id WHERE id = v_user_id;
    INSERT INTO public.user_roles (user_id, role, school_id) VALUES (v_user_id, r.role, v_school_id)
      ON CONFLICT (user_id, role, school_id) DO NOTHING;
  END LOOP;

  FOR r IN
    SELECT * FROM (VALUES
      ('Mia Parker', '4A', 'Grade 4'),
      ('Leo Parker', '2B', 'Grade 2'),
      ('Iris Chen', '4A', 'Grade 4'),
      ('Noah Adams', '5C', 'Grade 5')
    ) AS t(full_name, class_name, grade)
  LOOP
    SELECT id INTO v_cid FROM public.children WHERE full_name = r.full_name AND school_id = v_school_id;
    IF v_cid IS NULL THEN
      INSERT INTO public.children (full_name, school_id, class_name, grade)
      VALUES (r.full_name, v_school_id, r.class_name, r.grade) RETURNING id INTO v_cid;
    END IF;
    v_child_ids := array_append(v_child_ids, v_cid);
  END LOOP;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'parent@demo.school';
  INSERT INTO public.parent_children (parent_id, child_id, relationship)
  VALUES (v_user_id, v_child_ids[1], 'parent'), (v_user_id, v_child_ids[2], 'parent')
  ON CONFLICT (parent_id, child_id) DO NOTHING;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'delegate@demo.school';
  INSERT INTO public.parent_children (parent_id, child_id, relationship)
  VALUES (v_user_id, v_child_ids[1], 'delegate')
  ON CONFLICT (parent_id, child_id) DO NOTHING;
END $$;
