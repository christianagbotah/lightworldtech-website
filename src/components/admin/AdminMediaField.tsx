'use client';

import { ChangeEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImageIcon, Images, Loader2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MediaItem = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  modifiedAt: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
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

export default function AdminMediaField({
  label,
  value,
  onChange,
  placeholder = 'Choose from Media Library or enter an image URL',
  help,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to load media');
      setItems(Array.isArray(payload?.data?.items) ? payload.data.items : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadMedia();
  }, [open]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.filename, item.mimeType].some((candidate) =>
        candidate.toLowerCase().includes(query),
      ),
    );
  }, [items, search]);

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

      const url = String(payload?.data?.url || '');
      if (url) {
        onChange(url);
        toast.success('Image uploaded and selected');
        setOpen(false);
      } else {
        await loadMedia();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
  };

  const selectItem = (item: MediaItem) => {
    onChange(item.url);
    setOpen(false);
    toast.success('Image selected from Media Library');
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
          <Images className="mr-2 size-4" />
          Choose media
        </Button>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {value && (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <img
              src={value}
              alt=""
              className="max-h-full max-w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{value}</p>
            <button
              type="button"
              onClick={() => onChange('')}
              className="mt-1 text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Clear image
            </button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose from Media Library</DialogTitle>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={uploadFile}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media"
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Upload new
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading Media Library…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <ImageIcon className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                {items.length === 0 ? 'No images in the Media Library yet' : 'No media matches this search'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a JPG, PNG, GIF or WebP image to use it here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <button
                  key={item.filename}
                  type="button"
                  onClick={() => selectItem(item)}
                  className={
                    'overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md ' +
                    (value === item.url ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border/60')
                  }
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 p-2">
                    <img src={item.url} alt="" loading="lazy" className="max-h-full max-w-full rounded-lg object-contain" />
                  </div>
                  <div className="p-3">
                    <p className="truncate font-mono text-[10px] font-semibold">{item.filename}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatBytes(item.sizeBytes)} · {item.mimeType.replace('image/', '').toUpperCase()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
