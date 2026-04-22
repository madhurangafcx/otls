'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { Icons } from '@/components/icons';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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

// 6 states per docs/design/GAPS.md §13 DropzoneStates.
// - idle: default, dashed border
// - dragging: file is over the zone
// - uploading: TUS resumable in flight (cancel + progress + bytes)
// - registering: upload done, waiting on POST /api/assignments
// - success: green panel with "submit another" reset link
// - error: red panel with reason + try again
type Phase = 'idle' | 'dragging' | 'uploading' | 'registering' | 'success' | 'error';

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_');
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// TUS resumable upload straight to Supabase Storage — blueprint §14.4 + eng-review
// upgrade. The client uploads with its own JWT; Storage RLS enforces path prefix.
// After the upload completes, we POST /api/assignments so the backend can sniff
// magic bytes, insert the row, and upsert progress.
export function UploadDropzone({ studentId, semesterId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progressPct, setProgressPct] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setProgressPct(0);
    setBytesSent(0);
    setBytesTotal(0);
    setFileName('');
    uploadRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const cancel = useCallback(() => {
    uploadRef.current?.abort().catch(() => undefined);
    reset();
  }, [reset]);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      setProgressPct(0);
      setBytesSent(0);
      setBytesTotal(file.size);
      setFileName(file.name);

      // Client-side gate — friendly error. Backend re-validates authoritatively.
      const ext = extOf(file.name);
      if (!ALLOWED_EXT.includes(ext as 'pdf' | 'docx')) {
        setPhase('error');
        setError(`${file.name} isn't a PDF or DOCX.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setPhase('error');
        setError(`${file.name} is ${formatBytes(file.size)} · max 25 MB`);
        return;
      }

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
      const CHUNK = 6 * 1024 * 1024;

      try {
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
            onError: (err) => reject(err),
            onProgress: (sent, total) => {
              setBytesSent(sent);
              setBytesTotal(total);
              setProgressPct(Math.round((sent / total) * 100));
            },
            onSuccess: () => resolve(),
          });
          uploadRef.current = upload;
          upload.start();
        });
      } catch (err: unknown) {
        // Aborted uploads throw — treat as an intentional reset, not an error.
        if (phase === 'idle') return;
        setPhase('error');
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(`Upload failed: ${msg}`);
        return;
      }

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

      uploadRef.current = null;
      setPhase('success');
      // Re-fetch the page so the submissions list + progress update.
      router.refresh();
    },
    [studentId, semesterId, router, phase]
  );

  // Drag + drop handlers. Only transition to 'dragging' when we can accept
  // the drop (i.e. not mid-upload). We don't attempt to inspect the file types
  // via DataTransfer.items here because Firefox doesn't populate them
  // reliably until drop — consistent UX is better than MIME-sniffing at hover.
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (phase === 'idle' || phase === 'error' || phase === 'success') {
      setPhase('dragging');
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDragLeave = (e: React.DragEvent) => {
    // Only revert if we actually left the label, not a child element.
    if (e.currentTarget === e.target) {
      if (phase === 'dragging') setPhase('idle');
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void onFile(f);
    else if (phase === 'dragging') setPhase('idle');
  };

  // Outer surface classes — shift color/border per state.
  const isBusy = phase === 'uploading' || phase === 'registering';
  const surfaceClasses =
    phase === 'dragging'
      ? 'border-accent-600 bg-accent-50'
      : phase === 'success'
        ? 'border-success-border bg-success-bg'
        : phase === 'error'
          ? 'border-danger-border bg-danger-bg'
          : isBusy
            ? 'border-accent-500 bg-accent-50'
            : 'border-line hover:border-accent-500 hover:bg-accent-50/50';

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <h2 className="font-display text-h3 font-medium mb-2">Submit your assignment</h2>
      <p className="text-body-sm text-muted mb-4">
        PDF or DOCX, max 25 MB. Upload resumes automatically if your connection drops.
        Once submitted, this semester is marked complete.
      </p>

      <label
        htmlFor="assignment-file"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'block rounded-drop border-2 border-dashed transition-colors px-6 py-10 text-center',
          isBusy ? 'cursor-default' : 'cursor-pointer',
          surfaceClasses,
        ].join(' ')}
      >
        <input
          ref={inputRef}
          id="assignment-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={isBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />

        {/* ── Idle ───────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center">
            <Icons.Upload size={28} className="text-subtle mb-3" />
            <div className="font-medium text-body">Drop PDF or DOCX</div>
            <div className="text-body-sm text-muted mt-1">or click to choose a file</div>
          </div>
        )}

        {/* ── Dragging over ──────────────────────────────────── */}
        {phase === 'dragging' && (
          <div className="flex flex-col items-center text-accent-700">
            <Icons.Upload size={28} className="text-accent-600 mb-3" />
            <div className="font-medium text-body text-accent-700">Release to upload</div>
            <div className="text-body-sm text-accent-700/80 mt-1">1 file detected</div>
          </div>
        )}

        {/* ── Uploading ──────────────────────────────────────── */}
        {phase === 'uploading' && (
          <div className="max-w-md mx-auto text-left">
            <div className="flex items-center gap-3 mb-3">
              <Icons.FileText size={20} className="text-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-body truncate">{fileName}</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  cancel();
                }}
                title="Cancel upload"
                className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-black/[0.05] text-muted"
              >
                <Icons.X size={16} />
              </button>
            </div>
            <div className="h-2 rounded-pill bg-line overflow-hidden">
              <div
                className="h-full bg-accent-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-caption text-muted tabular-nums">
              <span>{progressPct}%</span>
              <span>
                {formatBytes(bytesSent)} of {formatBytes(bytesTotal)}
              </span>
            </div>
          </div>
        )}

        {/* ── Registering (upload done, backend validating) ──── */}
        {phase === 'registering' && (
          <div className="flex flex-col items-center text-muted">
            <Icons.Loader size={24} className="text-accent-600 mb-2 animate-spin" />
            <div className="text-body-sm">Verifying and saving submission…</div>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────── */}
        {phase === 'success' && (
          <div className="flex flex-col items-center text-success-fg">
            <Icons.CircleCheck size={28} className="mb-3" />
            <div className="font-medium text-body">
              Uploaded · Semester marked complete
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                reset();
              }}
              className="mt-2 text-body-sm font-medium underline hover:no-underline"
            >
              Submit another
            </button>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="flex flex-col items-center text-danger-fg">
            <Icons.X size={24} className="mb-2" />
            <div className="text-body font-medium max-w-sm">
              {error ?? 'Something went wrong.'}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                reset();
              }}
              className="mt-2 text-body-sm font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </label>
    </div>
  );
}
