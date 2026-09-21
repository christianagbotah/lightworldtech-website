'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Mail, MailOpen, Eye, Phone, Copy, Check, GitBranch, Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors ml-1"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

export default function AdminMessages() {
  const { navigate } = useAppStore();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/contact?limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const payload = await res.json();
      const nextMessages = Array.isArray(payload) ? payload : (payload.data || []);
      setMessages(nextMessages);
      setTotalMessages(Number(payload?.pagination?.total ?? nextMessages.length));
      setSelectedIds((current) => new Set([...current].filter((id) => nextMessages.some((message: ContactMessage) => message.id === id))));
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!messages.length || typeof window === 'undefined') return;
    const requestedId = sessionStorage.getItem('lw-open-message-id');
    if (!requestedId) return;
    const match = messages.find((message) => message.id === requestedId);
    sessionStorage.removeItem('lw-open-message-id');
    if (match) {
      setViewing(match);
      setViewOpen(true);
      if (!match.read) void markRead(match, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const unreadCount = messages.filter(m => !m.read).length;

  const handleView = (msg: ContactMessage) => {
    setViewing(msg);
    setViewOpen(true);
    if (!msg.read) {
      markRead(msg, true);
    }
  };

  const markRead = async (msg: ContactMessage, read: boolean) => {
    try {
      const res = await fetch(`/api/contact/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchMessages();
    } catch {
      toast.error('Failed to update message');
    }
  };

  const allLoadedSelected = messages.length > 0 && selectedIds.size === messages.length;

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllLoaded = () => {
    setSelectedIds(allLoadedSelected ? new Set() : new Set(messages.map((message) => message.id)));
  };

  const bulkMark = async (read: boolean) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkUpdating(true);
    try {
      const response = await fetch('/api/admin/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, read }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to update selected messages');

      setSelectedIds(new Set());
      await fetchMessages();
      toast.success(ids.length + ' message' + (ids.length === 1 ? '' : 's') + (read ? ' marked read' : ' marked unread'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update selected messages');
    } finally {
      setBulkUpdating(false);
    }
  };

  const exportMessages = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/messages/export', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to export messages');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'lightworld-messages-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Messages export downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export messages');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/contact/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Message deleted');
      setDeleteOpen(false);
      setDeleting(null);
      fetchMessages();
    } catch {
      toast.error('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalMessages} total messages
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportMessages()} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => navigate('admin-crm')}>
            <GitBranch className="mr-2 size-4" /> Open CRM Pipeline
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedIds.size} selected</p>
            <p className="text-xs text-muted-foreground">Bulk actions are limited to the currently loaded records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void bulkMark(true)} disabled={bulkUpdating}>
              <MailOpen className="mr-2 size-3.5" /> Mark read
            </Button>
            <Button size="sm" variant="outline" onClick={() => void bulkMark(false)} disabled={bulkUpdating}>
              <Mail className="mr-2 size-3.5" /> Mark unread
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={bulkUpdating}>
              <X className="mr-2 size-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="max-w-full overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                <TableHead className="w-10 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allLoadedSelected}
                    onChange={toggleAllLoaded}
                    aria-label="Select all loaded messages"
                    className="size-4 rounded border-border accent-amber-600"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Sender</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Subject</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No messages yet.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    onClick={() => handleView(msg)}
                    className={`cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200 ${
                      !msg.read ? 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400 bg-amber-50/30 dark:bg-amber-900/5' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(msg.id)}
                        onChange={() => toggleSelected(msg.id)}
                        aria-label={'Select message from ' + msg.name}
                        className="size-4 rounded border-border accent-amber-600"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {!msg.read ? (
                          <span className="relative flex size-2 shrink-0">
                            <span className="animate-ping absolute inline-flex size-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
                          </span>
                        ) : (
                          <Mail className="size-3 text-slate-400 shrink-0" />
                        )}
                        <span className={msg.read ? '' : 'font-bold'}>{msg.name}</span>
                        {msg.phone && (
                          <span title="Phone inquiry"><Phone className="size-3 text-muted-foreground ml-1" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      <span className="flex items-center gap-1">
                        <span className="truncate max-w-[150px]">{msg.email}</span>
                        <CopyButton text={msg.email} label="email" />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{msg.subject || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <button onClick={(event) => { event.stopPropagation(); void markRead(msg, !msg.read); }} className="cursor-pointer">
                        <Badge className={
                          msg.read
                            ? 'bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500 text-white border-0'
                            : 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm'
                        }>
                          {msg.read ? 'Read' : 'Unread'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleView(msg); }} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void markRead(msg, !msg.read); }} title={msg.read ? 'Mark unread' : 'Mark read'}>
                          {msg.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setDeleting(msg); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Message Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl overflow-x-hidden overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                {viewing?.phone ? <Phone className="size-5" /> : <Mail className="size-5" />}
              </span>
              <span className="min-w-0 truncate">{viewing?.subject || 'Message Details'}</span>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 p-6">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Customer message</p>
                  <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">{viewing.message}</p>
                </div>
              </div>
              <aside className="space-y-5 border-t border-border bg-muted/15 p-6 lg:border-l lg:border-t-0">
                <div className="grid gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <p className="font-medium">{viewing.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium flex items-center">
                    {viewing.email}
                    <CopyButton text={viewing.email} label="email" />
                  </p>
                </div>
                {viewing.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium flex items-center">
                      {viewing.phone}
                      <CopyButton text={viewing.phone} label="phone number" />
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {new Date(viewing.createdAt).toLocaleDateString()} {new Date(viewing.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quick actions</p>
                  <div className="mt-3 grid gap-2">
                    <a href={'mailto:' + viewing.email} className="inline-flex h-10 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700">
                      Reply by email
                    </a>
                    {viewing.phone && (
                      <a href={'tel:' + viewing.phone} className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">
                        Call customer
                      </a>
                    )}
                    <Button variant="outline" onClick={() => { setViewOpen(false); navigate('admin-crm'); }}>
                      <GitBranch className="mr-2 size-4" /> Open CRM Pipeline
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          )}
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the message from &quot;{deleting?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
