'use client';

import { useState } from 'react';
import type { AnnouncementPayload } from '@/lib/api';

type Props = {
  announcement: AnnouncementPayload;
  // The app origin is used to build the share link inside the WA message body.
  // Server component passes process.env.NEXT_PUBLIC_APP_URL or the request URL.
  appOrigin: string;
  // Visual density: "pinned" surfaces with a highlighted card; "compact" for
  // the rest of the feed.
  variant?: 'pinned' | 'compact';
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildWaHref(a: AnnouncementPayload, appOrigin: string): string {
  // wa.me deeplink. Works on mobile (opens WA app) + desktop (WA Web).
  // Pre-fills title + 200-char body excerpt + link back to OTLS.
  const excerpt = a.body.length > 200 ? `${a.body.slice(0, 200)}…` : a.body;
  const link = `${appOrigin}/courses/${a.course_id}`;
  const text = `${a.title}\n\n${excerpt}\n\n${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function AnnouncementCard({ announcement, appOrigin, variant = 'compact' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isPinned = variant === 'pinned' || announcement.pinned;
  const body = announcement.body;
  const showToggle = body.length > 280;
  const shown = !showToggle || expanded ? body : `${body.slice(0, 280)}…`;

  return (
    <article
      className={[
        'rounded-card border p-5',
        isPinned
          ? 'border-warning-border bg-warning-bg'
          : 'border-line bg-surface',
      ].join(' ')}
    >
      <header className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isPinned && (
            <span className="inline-flex items-center gap-1 text-caption uppercase text-warning-fg tracking-[0.08em] shrink-0">
              ★ Pinned
            </span>
          )}
          <h3 className="font-display text-h3 font-medium truncate">
            {announcement.title}
          </h3>
        </div>
        <time
          dateTime={announcement.created_at}
          className="text-caption text-muted shrink-0"
        >
          {formatDate(announcement.created_at)}
        </time>
      </header>

      <p
        className={[
          'text-body-sm whitespace-pre-wrap',
          isPinned ? 'text-warning-fg' : 'text-ink',
        ].join(' ')}
      >
        {shown}
      </p>

      <div className="flex items-center gap-4 mt-3">
        {showToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-body-sm font-medium text-accent-600 hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <a
          href={buildWaHref(announcement, appOrigin)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm font-medium text-accent-600 hover:underline ml-auto"
        >
          Share via WhatsApp →
        </a>
      </div>
    </article>
  );
}
