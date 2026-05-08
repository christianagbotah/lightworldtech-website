'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Briefcase, Users, Mail, FolderOpen, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalPosts: number;
  activeServices: number;
  activeTeam: number;
  unreadMessages: number;
  activePortfolio: number;
  activeTestimonials: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
  category?: { name: string } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const statCards = [
  { key: 'totalPosts' as const, label: 'Blog Posts', icon: FileText, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  { key: 'activeServices' as const, label: 'Services', icon: Briefcase, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  { key: 'activeTeam' as const, label: 'Team Members', icon: Users, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Mail, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  { key: 'activePortfolio' as const, label: 'Portfolio', icon: FolderOpen, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
  { key: 'activeTestimonials' as const, label: 'Testimonials', icon: MessageSquare, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [recentMessages, setRecentMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, postsRes, messagesRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/blog?limit=5'),
          fetch('/api/contact?limit=5'),
        ]);

        if (!statsRes.ok || !postsRes.ok || !messagesRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [statsData, postsData, messagesData] = await Promise.all([
          statsRes.json(),
          postsRes.json(),
          messagesRes.json(),
        ]);

        setStats(statsData);
        setRecentPosts(postsData);
        setRecentMessages(messagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, Admin</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your website today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key] || 0;
          return (
            <Card key={card.key} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent data tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent posts */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Blog Posts</h2>
            </div>
            {recentPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No posts yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{post.title}</TableCell>
                      <TableCell>
                        {post.published ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent messages */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Messages</h2>
            </div>
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No messages yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium text-sm">
                        <span className={msg.read ? '' : 'font-bold'}>{msg.name}</span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate text-muted-foreground">{msg.subject || 'No subject'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
