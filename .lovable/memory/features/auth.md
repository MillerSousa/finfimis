---
name: Auth flow
description: Email+password auth with admin user creation via edge function, RLS policies on all tables
type: feature
---
- Login via supabase.auth.signInWithPassword
- No public signup (disable_signup=true). New users created by admin via edge function `admin-users`
- Edge function uses service role key to call admin.createUser, admin.deleteUser, admin.updateUserById
- profiles.auth_user_id links to auth.users(id)
- RLS uses security definer function get_my_profile_id() to avoid recursion
- Auto-confirm email enabled — no email verification needed
- Reset password via /reset-password route
- Session persistence via localStorage (Supabase default)
- Logout button in Config tab
