'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Mail, MailOpen, Eye, EyeOff, Phone, Copy, Check } from 'lucide-react';
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
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors ml-1"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/contact');
      if (!res.ok) throw new Error('Failed to fetch');
      setMessages(await res.json());
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {messages.length} total messages
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-sm">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/30 dark:from-slate-800/80 dark:to-slate-800/30">
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No messages yet.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className={`hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5 transition-colors duration-200 ${
                      !msg.read ? 'border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/5' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {!msg.read ? (
                          <span className="relative flex size-2 shrink-0">
                            <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                          </span>
                        ) : (
                          <Mail className="size-3 text-slate-400 shrink-0" />
                        )}
                        <span className={msg.read ? '' : 'font-bold'}>{msg.name}</span>
                        {msg.phone && (
                          <Phone className="size-3 text-muted-foreground ml-1" title="Phone inquiry" />
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
                      <button onClick={() => markRead(msg, !msg.read)} className="cursor-pointer">
                        <Badge className={
                          msg.read
                            ? 'bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500 text-white border-0'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-0 shadow-sm'
                        }>
                          {msg.read ? 'Read' : 'Unread'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(msg)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => markRead(msg, !msg.read)} title={msg.read ? 'Mark unread' : 'Mark read'}>
                          {msg.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleting(msg); setDeleteOpen(true); }}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.phone ? <Phone className="size-4 text-emerald-500" /> : <Mail className="size-4 text-emerald-500" />}
              {viewing?.subject || 'Message Details'}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                <span className="text-sm text-muted-foreground">Message:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{viewing.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
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
