-- Yara lead media: private storage for customer photos and voice notes.
-- Run once in the Supabase SQL Editor before using the new attachment controls.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yara-lead-media',
  'yara-lead-media',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/3gpp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Yara lead media select own" on storage.objects;
create policy "Yara lead media select own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'yara-lead-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.customer_leads l
    where l.id::text = (storage.foldername(name))[3]
      and l.shop_id::text = (storage.foldername(name))[2]
      and l.user_id = auth.uid()
  )
);

drop policy if exists "Yara lead media insert own" on storage.objects;
create policy "Yara lead media insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'yara-lead-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.customer_leads l
    where l.id::text = (storage.foldername(name))[3]
      and l.shop_id::text = (storage.foldername(name))[2]
      and l.user_id = auth.uid()
  )
);

drop policy if exists "Yara lead media delete own" on storage.objects;
create policy "Yara lead media delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'yara-lead-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.customer_leads l
    where l.id::text = (storage.foldername(name))[3]
      and l.shop_id::text = (storage.foldername(name))[2]
      and l.user_id = auth.uid()
  )
);
