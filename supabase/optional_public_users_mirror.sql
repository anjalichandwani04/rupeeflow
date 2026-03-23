-- OPTIONAL: mirror next_auth.users into public.users (only if you want a public.users table)
-- Run AFTER next_auth_schema.sql. Adjust columns to match your app.

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES next_auth.users (id) ON DELETE CASCADE,
  name text,
  email text,
  image text
);

CREATE OR REPLACE FUNCTION public.handle_next_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, image)
  VALUES (NEW.id, NEW.name, NEW.email, NEW.image)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        image = EXCLUDED.image;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_next_auth_user_created ON next_auth.users;
CREATE TRIGGER on_next_auth_user_created
  AFTER INSERT OR UPDATE ON next_auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_next_auth_user_created();

-- Backfill existing rows
INSERT INTO public.users (id, name, email, image)
SELECT id, name, email, image FROM next_auth.users
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      image = EXCLUDED.image;
