-- Private storage for Yara lead photos and voice notes.
-- Object paths are: <auth.uid>/<shop_id>/<lead_id>/<file>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-attachments',
  'lead-attachments',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/x-m4a'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own lead attachments" on storage.objects;
create policy "Users can read their own lead attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lead-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own lead attachments" on storage.objects;
create policy "Users can upload their own lead attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lead-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own lead attachments" on storage.objects;
create policy "Users can delete their own lead attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lead-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
