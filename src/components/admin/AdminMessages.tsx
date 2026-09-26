'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Trash2, Mail, MailOpen, Eye, Phone, Copy, Check, GitBranch, Download, Loader2, X, Send, Reply, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAppStore } from '@/lib/store';
import { readJsonResponse } from '@/lib/client-api';

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

interface ContactReply {
  id: string;
  authorName: string;
  authorEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  transport: string;
  error: string;
  sentAt: string | null;
  createdAt: string;
}

function replySubject(subject: string): string {
  const value = subject.trim();
  if (!value) return 'Re: Your enquiry to Lightworld Technologies';
  return /^re:/i.test(value) ? value : 'Re: ' + value;
}

type MessageReplyApiPayload<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  details?: string;
};

async function readMessageReplyApiPayload<T = unknown>(
  response: Response,
): Promise<MessageReplyApiPayload<T>> {
  const raw = await response.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw) as MessageReplyApiPayload<T>;
  } catch {
    const status = response.status ? 'HTTP ' + response.status : 'an unknown status';
    if (!response.ok) {
      return {
        success: false,
        error:
          'The website gateway returned ' +
          status +
          ' without a JSON response. The reply was not confirmed as delivered; please retry after checking mail transport status.',
      };
    }

    throw new Error('The message reply API returned an unexpected non-JSON response (' + status + ').');
  }
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const [replySubjectValue, setReplySubjectValue] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyHistory, setReplyHistory] = useState<ContactReply[]>([]);
  const [replyHistoryLoading, setReplyHistoryLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [retryingReplyId, setRetryingReplyId] = useState('');
  const [messageQuery, setMessageQuery] = useState('');
  const [messageStatus, setMessageStatus] = useState<'all' | 'unread' | 'read'>('all');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/contact?limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const payload = await readJsonResponse<any>(res, 'Invalid server response');
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
    const requestedReplyId = sessionStorage.getItem('lw-reply-message-id');
    const requestedViewId = sessionStorage.getItem('lw-open-message-id');
    const requestedId = requestedReplyId || requestedViewId;
    if (!requestedId) return;

    const match = messages.find((message) => message.id === requestedId);
    sessionStorage.removeItem('lw-reply-message-id');
    sessionStorage.removeItem('lw-open-message-id');

    if (match && requestedReplyId) {
      setReplyingTo(match);
      setReplySubjectValue(replySubject(match.subject));
      setReplyBody('');
      setReplyOpen(true);
      void loadReplies(match.id);
      if (!match.read) void markRead(match, true);
      return;
    }

    if (match) {
      setViewing(match);
      setViewOpen(true);
      void loadReplies(match.id);
      if (!match.read) void markRead(match, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const unreadCount = messages.filter(m => !m.read).length;

  const visibleMessages = useMemo(() => {
    const query = messageQuery.trim().toLowerCase();
    return messages.filter((message) => {
      if (messageStatus === 'unread' && message.read) return false;
      if (messageStatus === 'read' && !message.read) return false;
      if (!query) return true;
      return [
        message.name,
        message.email,
        message.phone,
        message.subject,
        message.message,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [messages, messageQuery, messageStatus]);

  const allVisibleSelected =
    visibleMessages.length > 0 &&
    visibleMessages.every((message) => selectedIds.has(message.id));

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleMessages.forEach((message) => next.delete(message.id));
      } else {
        visibleMessages.forEach((message) => next.add(message.id));
      }
      return next;
    });
  };

  const loadReplies = async (messageId: string) => {
    setReplyHistoryLoading(true);
    try {
      const response = await fetch('/api/admin/messages/' + encodeURIComponent(messageId) + '/replies', {
        cache: 'no-store',
      });
      const payload = await readMessageReplyApiPayload<ContactReply[]>(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Could not load reply history');
      setReplyHistory(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setReplyHistory([]);
      toast.error(error instanceof Error ? error.message : 'Could not load reply history');
    } finally {
      setReplyHistoryLoading(false);
    }
  };

  const handleView = (msg: ContactMessage) => {
    setViewing(msg);
    setViewOpen(true);
    void loadReplies(msg.id);
    if (!msg.read) {
      void markRead(msg, true);
    }
  };

  const openReply = (msg: ContactMessage) => {
    setReplyingTo(msg);
    setReplySubjectValue(replySubject(msg.subject));
    setReplyBody('');
    setViewOpen(false);
    setReplyOpen(true);
    void loadReplies(msg.id);
    if (!msg.read) void markRead(msg, true);
  };

  const sendReply = async () => {
    if (!replyingTo || !replySubjectValue.trim() || !replyBody.trim()) return;
    setReplySending(true);

    try {
      const response = await fetch(
        '/api/admin/messages/' + encodeURIComponent(replyingTo.id) + '/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: replySubjectValue.trim(),
            body: replyBody.trim(),
          }),
        },
      );
      const payload = await readMessageReplyApiPayload<ContactReply>(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Reply could not be sent');

      toast.success('Reply sent', {
        description: 'Delivered to ' + replyingTo.email + ' from the Lightworld admin portal.',
      });
      setReplyBody('');
      await Promise.all([loadReplies(replyingTo.id), fetchMessages()]);
      setReplyOpen(false);
      setViewing({ ...replyingTo, read: true });
      setViewOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reply could not be sent');
      if (replyingTo) await loadReplies(replyingTo.id);
    } finally {
      setReplySending(false);
    }
  };

  const retryFailedReply = async (reply: ContactReply) => {
    if (!viewing || reply.status !== 'failed' || retryingReplyId) return;
    setRetryingReplyId(reply.id);
    try {
      const response = await fetch(
        '/api/admin/messages/' +
          encodeURIComponent(viewing.id) +
          '/replies/' +
          encodeURIComponent(reply.id) +
          '/retry',
        { method: 'POST' },
      );
      const payload = await readMessageReplyApiPayload<ContactReply>(response);
      if (!response.ok) throw new Error(payload?.details || payload?.error || 'Reply could not be retried');

      toast.success('Reply delivered', {
        description: 'The saved failed reply was sent successfully.',
      });
      await Promise.all([loadReplies(viewing.id), fetchMessages()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reply could not be retried');
      await loadReplies(viewing.id);
    } finally {
      setRetryingReplyId('');
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

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      const payload = await readJsonResponse<any>(response, 'Invalid server response');
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
      <AdminPageHeader
        eyebrow="Communications"
        title="Messages"
        description={totalMessages + ' total messages' + (unreadCount > 0 ? ' · ' + unreadCount + ' unread' : '')}
        actions={
          <>
            <Button variant="outline" onClick={() => void exportMessages()} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('admin-crm')}>
              <GitBranch className="mr-2 size-4" /> Open CRM Pipeline
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(260px,2fr)_170px_auto] lg:items-center">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={messageQuery}
            onChange={(event) => setMessageQuery(event.target.value)}
            placeholder="Search sender, email, phone, subject or message"
            className="pl-9"
          />
        </label>
        <select
          value={messageStatus}
          onChange={(event) => setMessageStatus(event.target.value as 'all' | 'unread' | 'read')}
          className="h-10 rounded-xl border border-input bg-background px-3.5 text-sm transition hover:border-amber-300/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
          aria-label="Filter messages by read status"
        >
          <option value="all">All messages</option>
          <option value="unread">Unread only</option>
          <option value="read">Read only</option>
        </select>
        <Button type="button" variant="outline" onClick={() => void fetchMessages()} className="lg:justify-self-end">
          <RefreshCw className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedIds.size} selected</p>
            <p className="text-xs text-muted-foreground">Bulk actions apply only to the messages you selected in the current loaded inbox.</p>
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
          <Table exportFileName="lightworld-customer-messages">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
                <TableHead data-export-ignore className="w-10 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible messages"
                    className="size-4 rounded border-border accent-amber-600"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Sender</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Subject</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                <TableHead data-export-ignore className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {messages.length === 0 ? 'No messages yet.' : 'No messages match the current search or status filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleMessages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    onClick={() => handleView(msg)}
                    className={`cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200 ${
                      !msg.read ? 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400 bg-amber-50/30 dark:bg-amber-900/5' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <TableCell data-export-ignore onClick={(event) => event.stopPropagation()}>
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
                    <TableCell data-export-ignore className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleView(msg); }} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openReply(msg); }} title="Reply internally">
                          <Reply className="h-4 w-4 text-amber-600" />
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

                <div className="mt-5 rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Internal correspondence history</p>
                      <p className="mt-1 text-xs text-muted-foreground">Replies sent from the Lightworld admin portal.</p>
                    </div>
                    <Badge variant="outline">{replyHistory.length} repl{replyHistory.length === 1 ? 'y' : 'ies'}</Badge>
                  </div>

                  <div className="mt-4 max-h-[34vh] space-y-3 overflow-y-auto pr-1">
                    {replyHistoryLoading ? (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" /> Loading reply history…
                      </div>
                    ) : replyHistory.length === 0 ? (
                      <p className="rounded-xl bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">No internal replies sent yet.</p>
                    ) : replyHistory.map((reply) => (
                      <div key={reply.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{reply.authorName || 'Administrator'}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(reply.createdAt).toLocaleString()}</p>
                          </div>
                          <Badge className={
                            reply.status === 'sent'
                              ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : reply.status === 'failed'
                                ? 'border-0 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                                : 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                          }>
                            {reply.status === 'sent' ? 'Sent' : reply.status === 'failed' ? 'Failed' : 'Sending'}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs font-semibold">{reply.subject}</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{reply.body}</p>
                        {reply.status === 'failed' && (
                          <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                            <p className="font-semibold">Delivery failed. The attempt remains in the audit history.</p>
                            {reply.error && <p className="mt-1 break-words opacity-80">{reply.error}</p>}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-3 h-8 bg-background/80"
                              disabled={Boolean(retryingReplyId)}
                              onClick={() => void retryFailedReply(reply)}
                            >
                              {retryingReplyId === reply.id
                                ? <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                : <RefreshCw className="mr-1.5 size-3.5" />}
                              Retry delivery
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                    <Button onClick={() => openReply(viewing)} className="bg-amber-600 text-white hover:bg-amber-700">
                      <Reply className="mr-2 size-4" /> Reply internally
                    </Button>
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

      <Dialog open={replyOpen} onOpenChange={(open) => {
        if (!replySending) setReplyOpen(open);
      }}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Reply className="size-5" />
              </span>
              <span>
                Reply internally
                {replyingTo && <span className="ml-2 text-sm font-normal text-muted-foreground">to {replyingTo.name}</span>}
              </span>
            </DialogTitle>
          </DialogHeader>

          {replyingTo && (
            <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
              <div className="min-w-0 space-y-5 p-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  This reply is sent directly from the Lightworld website mail transport and recorded against this customer enquiry. No Gmail, Outlook or external mail client is opened.
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={replyingTo.name + ' <' + replyingTo.email + '>'} readOnly className="bg-muted/40" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal-reply-subject">Subject</Label>
                  <Input
                    id="internal-reply-subject"
                    value={replySubjectValue}
                    onChange={(event) => setReplySubjectValue(event.target.value)}
                    maxLength={200}
                    placeholder="Reply subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal-reply-body">Message</Label>
                  <Textarea
                    id="internal-reply-body"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    maxLength={8000}
                    rows={12}
                    placeholder={'Write your reply to ' + replyingTo.name + '…'}
                    className="min-h-[280px] resize-y leading-6"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>A Lightworld Technologies signature and original-enquiry context are appended automatically.</span>
                    <span>{replyBody.length.toLocaleString()} / 8,000</span>
                  </div>
                </div>
              </div>

              <aside className="min-w-0 space-y-5 border-t border-border bg-muted/15 p-6 lg:border-l lg:border-t-0">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Original enquiry</p>
                  <div className="mt-3 rounded-xl border border-border/60 bg-background p-4">
                    <p className="text-sm font-semibold">{replyingTo.subject || 'Website enquiry'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(replyingTo.createdAt).toLocaleString()}</p>
                    <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{replyingTo.message}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previous replies</p>
                    <Badge variant="outline">{replyHistory.length}</Badge>
                  </div>
                  <div className="mt-3 max-h-[310px] space-y-2 overflow-y-auto pr-1">
                    {replyHistoryLoading ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">Loading history…</p>
                    ) : replyHistory.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No previous replies.</p>
                    ) : replyHistory.slice().reverse().map((reply) => (
                      <div key={reply.id} className="rounded-xl border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold">{reply.subject}</p>
                          <span className={reply.status === 'sent' ? 'text-[10px] font-semibold text-emerald-600' : 'text-[10px] font-semibold text-rose-600'}>
                            {reply.status}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{reply.body}</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">{new Date(reply.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setReplyOpen(false)} disabled={replySending}>Cancel</Button>
            <Button
              onClick={() => void sendReply()}
              disabled={replySending || !replySubjectValue.trim() || !replyBody.trim()}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {replySending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              {replySending ? 'Sending…' : 'Send reply'}
            </Button>
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
