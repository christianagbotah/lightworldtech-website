'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  ExternalLink,
  HardDrive,
  Images,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';

type MediaItem = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
};

type MediaLibraryData = {
  items: MediaItem[];
  totalFiles: number;
  totalBytes: number;
};

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** index;
  return amount.toFixed(index === 0 ? 0 : amount >= 10 ? 1 : 2) + ' ' + units[index];
}

export default function AdminMedia() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<MediaLibraryData>({
    items: [],
    totalFiles: 0,
    totalBytes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [search, setSearch] = useState('');

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load media');
      setData(payload.data || { items: [], totalFiles: 0, totalBytes: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMedia();
  }, []);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.items;
    return data.items.filter((item) =>
      [item.filename, item.mimeType].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [data.items, search]);

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to upload image');
      await loadMedia();
      toast.success('Image uploaded to the media library');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success('Media URL copied');
    } catch {
      toast.error('Could not copy the media URL');
    }
  };

  const deleteMedia = async (item: MediaItem) => {
    setDeleting(item.filename);
    try {
      const response = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.filename }),
      });
      const payload = await response.json();

      if (response.status === 409) {
        const references = Array.isArray(payload?.references)
          ? payload.references
              .map((reference: { label?: string; count?: number }) =>
                String(reference?.label || 'Content') + ' (' + Number(reference?.count || 0) + ')',
              )
              .join(', ')
          : '';
        throw new Error(
          (payload?.error || 'This image is still in use.') +
            (references ? ' References: ' + references : ''),
        );
      }

      if (!response.ok) throw new Error(payload?.error || 'Unable to delete media');
      await loadMedia();
      toast.success('Unused image deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete media');
    } finally {
      setDeleting('');
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={uploadFile}
        className="hidden"
      />

      <AdminPageHeader
        eyebrow="Website & content"
        title="Media Library"
        description="Upload, review and reuse CMS images stored in persistent production storage. Deletion is blocked while an image is referenced by managed content."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void loadMedia()} disabled={loading}>
              <RefreshCw className={'mr-2 size-4 ' + (loading ? 'animate-spin' : '')} />
              Refresh
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Upload image
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Images className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{data.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Stored CMS images</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-white/70">
              <HardDrive className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{formatBytes(data.totalBytes)}</p>
              <p className="text-xs text-muted-foreground">Media storage used</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Image assets</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Copy an image URL to reuse it in Services, Blog, Team, Portfolio, Testimonials or Page Content.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search filename or type"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && data.items.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading media library…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Images className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                {data.items.length === 0 ? 'No uploaded CMS images yet' : 'No images match this search'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.items.length === 0
                  ? 'Upload your first JPG, PNG, GIF or WebP image.'
                  : 'Try a different filename or image type.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleItems.map((item) => (
                <Card key={item.filename} className="min-w-0 overflow-hidden border-border/60">
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 p-2">
                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] font-semibold" title={item.filename}>
                        {item.filename}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatBytes(item.sizeBytes)} · {item.mimeType.replace('image/', '').toUpperCase()} ·{' '}
                        {new Date(item.modifiedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl(item)}>
                        <Copy className="mr-1.5 size-3.5" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="mr-1.5 size-3.5" />
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleting === item.filename}
                        onClick={() => setPendingDelete(item)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        {deleting === item.filename ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1.5 size-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        tone="destructive"
        title="Delete this image?"
        description={
          pendingDelete
            ? 'Permanently delete “' + pendingDelete.filename + '” from the media library. The server will block deletion if the image is still referenced by website or client content.'
            : 'Permanently delete this image from the media library.'
        }
        confirmLabel="Delete image"
        onConfirm={async () => {
          if (pendingDelete) await deleteMedia(pendingDelete);
        }}
      />
    </div>
  );
}
