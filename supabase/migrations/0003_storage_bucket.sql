-- Storage bucket for assignment submissions.
-- Blueprint §14.3: private `assignments` bucket, 25 MB cap, PDF + DOCX only.
-- Storage RLS policies (0002_rls_policies.sql lines 220+) already scope access
-- to `{auth.uid()}/...` path prefixes, but the bucket itself needs to exist
-- before any of that runs. Originally missed in phase 1 setup — every student
-- submission 404'd on TUS upload until this migration landed.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'assignments',
  'assignments',
  false,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
