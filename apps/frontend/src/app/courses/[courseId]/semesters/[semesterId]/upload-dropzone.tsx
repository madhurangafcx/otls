'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { api, ApiClientError } from '@/lib/api';

type Props = {
  studentId: string;
  semesterId: string;
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB — blueprint §4.1
const ALLOWED_EXT = ['pdf', 'docx'] as const;
const ALLOWED_MIME: Record<(typeof ALLOWED_EXT)[number], string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

type Phase = 'idle' | 'uploading' | 'registering' | 'done' | 'error';

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_');
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

// TUS resumable upload straight to Supabase Storage — blueprint §14.4 + eng-review
// upgrade. The client uploads with its own JWT; Storage RLS enforces path prefix.
// After the upload completes, we POST /api/assignments so the backend can sniff
// magic bytes, insert the row, and upsert progress.
export function UploadDropzone({ studentId, semesterId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progressPct, setProgressPct] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      setProgressPct(0);
      setFileName(file.name);

      // Client-side gate — friendly error. Backend re-validates authoritatively.
      const ext = extOf(file.name);
      if (!ALLOWED_EXT.includes(ext as 'pdf' | 'docx')) {
        setPhase('error');
        setError('Only PDF or DOCX files are accepted.');
        return;
      }
      if (file.size > MAX_SIZE) {
        setPhase('error');
        setError('File too large. Max 25 MB.');
        return;
      }

      // Fetch fresh session to get a valid user JWT for TUS.
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPhase('error');
        setError('Session expired. Refresh and log in again.');
        return;
      }

      const safeName = sanitizeName(file.name);
      const objectName = `${studentId}/${semesterId}/${Date.now()}_${safeName}`;
      const contentType = ALLOWED_MIME[ext as 'pdf' | 'docx'];
      const tusEndpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

      setPhase('uploading');

      // Supabase Storage requires exactly 6 MB chunks except the final chunk.
      // Smaller/larger chunks will be rejected with 400.
      const CHUNK = 6 * 1024 * 1024;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: CHUNK,
          metadata: {
            bucketName: 'assignments',
            objectName,
            contentType,
            cacheControl: '3600',
          },
          onError: (err) => {
            reject(err);
          },
          onProgress: (sent, total) => {
            setProgressPct(Math.round((sent / total) * 100));
          },
          onSuccess: () => {
            resolve();
          },
        });
        upload.start();
      }).catch((err: unknown) => {
        setPhase('error');
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(`Upload failed: ${msg}`);
        throw err;
      });

      // Upload done → register with backend.
      setPhase('registering');
      try {
        await api.assignments.register(
          {
            semester_id: semesterId,
            file_path: objectName,
            file_name: file.name,
            file_type: ext as 'pdf' | 'docx',
          },
          session.access_token
        );
      } catch (err) {
        setPhase('error');
        if (err instanceof ApiClientError) {
          setError(`Registration failed: ${err.message}`);
        } else {
          setError('Registration failed.');
        }
        return;
      }

      setPhase('done');
      // Re-fetch the page so the submissions list + progress update.
      router.refresh();
    },
    [studentId, semesterId, router]
  );

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <h2 className="font-display text-h3 font-medium mb-2">Submit your assignment</h2>
      <p className="text-body-sm text-muted mb-4">
        PDF or DOCX, max 25 MB. Upload resumes automatically if your connection
        drops. Once submitted, this semester is marked complete.
      </p>

      <label
        htmlFor="assignment-file"
        className={[
          'block rounded-card border-2 border-dashed transition-colors cursor-pointer',
          phase === 'uploading' || phase === 'registering'
            ? 'border-accent-500 bg-accent-50'
            : 'border-line hover:border-accent-500 hover:bg-accent-50/50',
          'px-6 py-10 text-center',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          id="assignment-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={phase === 'uploading' || phase === 'registering'}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {phase === 'idle' && (
          <div>
            <div className="font-medium text-body mb-1">Choose a file to upload</div>
            <div className="text-body-sm text-muted">or drag and drop coming soon</div>
          </div>
        )}
        {phase === 'uploading' && (
          <div>
            <div className="font-medium text-body mb-2">
              Uploading <span className="text-muted">{fileName}</span>
            </div>
            <div className="h-2 rounded-pill bg-line overflow-hidden max-w-sm mx-auto">
              <div
                className="h-full bg-accent-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-caption text-muted mt-2">{progressPct}%</div>
          </div>
        )}
        {phase === 'registering' && (
          <div className="text-body-sm text-muted">
            Verifying and saving submission…
          </div>
        )}
        {phase === 'done' && (
          <div className="text-body-sm text-success-fg">
            ✓ Submitted. Your semester is marked complete.
          </div>
        )}
        {phase === 'error' && (
          <div className="text-body-sm text-danger-fg">
            {error ?? 'Something went wrong.'}
            <div className="mt-2">
              <button
                type="button"
                className="text-accent-600 underline"
                onClick={() => {
                  setPhase('idle');
                  setError(null);
                  setProgressPct(0);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}
