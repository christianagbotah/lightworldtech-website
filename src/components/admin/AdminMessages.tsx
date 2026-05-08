'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Mail, MailOpen, Eye, EyeOff } from 'lucide-react';
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
              <Badge className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
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
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Name</TableHead>
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
                  <TableRow key={msg.id} className={!msg.read ? 'bg-emerald-50/50 dark:bg-emerald-900/5' : ''}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {!msg.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                        {msg.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{msg.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{msg.subject || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => markRead(msg, !msg.read)} className="cursor-pointer">
                        <Badge className={
                          msg.read
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
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
            <DialogTitle>{viewing?.subject || 'Message Details'}</DialogTitle>
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
                  <p className="font-medium">{viewing.email}</p>
                </div>
                {viewing.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{viewing.phone}</p>
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
