-- =====================================================================
-- SQL สำหรับสร้างตารางและระบบล็อกสิทธิ์ใช้งานคนเดียวบน Supabase
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase -> SQL Editor -> กด Run
-- =====================================================================

-- 1. สร้างตารางเก็บข้อมูลผลการเรียน (1 บัญชี = 1 แถวข้อมูล)
create table if not exists public.study_tracker_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. เปิดใช้งาน Row Level Security (RLS) เพื่อป้องกันคนอื่นเข้าถึงข้อมูล
alter table public.study_tracker_data enable row level security;

-- 3. ลบ Policy เก่าถ้ามี (เผื่อรันซ้ำ)
drop policy if exists "Only owner can select own data" on public.study_tracker_data;
drop policy if exists "Only owner can insert own data" on public.study_tracker_data;
drop policy if exists "Only owner can update own data" on public.study_tracker_data;
drop policy if exists "Only owner can delete own data" on public.study_tracker_data;

-- 4. ตั้งสิทธิ์ให้เฉพาะเจ้าของบัญชีที่ Login อยู่เท่านั้นที่อ่าน/แก้ไขข้อมูลตัวเองได้
create policy "Only owner can select own data"
  on public.study_tracker_data
  for select
  using (auth.uid() = user_id);

create policy "Only owner can insert own data"
  on public.study_tracker_data
  for insert
  with check (auth.uid() = user_id);

create policy "Only owner can update own data"
  on public.study_tracker_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Only owner can delete own data"
  on public.study_tracker_data
  for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- ขั้นตอนสำคัญเพื่อให้ "ใช้ได้แค่เราคนเดียว" (ทำในหน้าเว็บ Supabase):
-- 1. ไปที่ Authentication -> Users -> กด Add user -> Create new user
--    ใส่อีเมลและรหัสผ่านของคุณเอง แล้วติ๊ก Auto Confirm User
-- 2. ไปที่ Authentication -> Sign In / Providers (หรือ Settings)
--    ปิดสวิตช์ "Allow new users to sign up" เพื่อไม่ให้คนอื่นสมัครเข้ามาได้
-- =====================================================================
