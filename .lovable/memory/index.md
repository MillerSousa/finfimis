# Project Memory

## Core
App "Minha Grana" - financial management, dark theme default, mobile-first. Primary #3B82F6, bg navy.
Auth via Supabase email+password. Auto-confirm enabled. No public signup — admin creates users via edge function.
RLS enabled on all tables. profiles.auth_user_id links to auth.users.
Currency R$ format pt-BR. Dates dd/mm/yyyy. All text pt-BR.

## Memories
- [DB Schema](mem://features/db-schema) — All tables: profiles (with auth_user_id), pix_keys, cards, expenses, receivables, debtors, collection_history, pj_entries, pj_goals
- [Auth flow](mem://features/auth) — Email+password login, edge function admin-users for CRUD, RLS with get_my_profile_id() security definer
- [Seed profiles](mem://features/seed-data) — Miller (blue) and "Minha esposa" (pink) pre-seeded with demo expenses
