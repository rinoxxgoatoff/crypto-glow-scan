UPDATE public.tg_users
SET username = NULL,
    first_name = NULL
WHERE username LIKE 'dev\_%' ESCAPE '\' OR first_name = 'Dev';