-- Enable RLS logic for storage (usually enabled by default, but good to ensure)
-- alter table storage.objects enable row level security;

-- 1. AVATARS CHECKS -----------------------------
-- Allow Public READ access to avatars
create policy "Public Access to Avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

-- Allow Authenticated upload to avatars
create policy "Authenticated Upload to Avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- 2. POST-IMAGES CHECKS -------------------------
-- Allow Public READ access to post-images
create policy "Public Access to Post Images"
on storage.objects for select
to public
using ( bucket_id = 'post-images' );

-- Allow Authenticated upload to post-images
create policy "Authenticated Upload to Post Images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'post-images' );
