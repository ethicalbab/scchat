
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT au.email INTO v_email
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE p.username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$;
