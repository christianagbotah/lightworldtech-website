'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Briefcase, Users, Mail, FolderOpen, MessageSquare,
  Plus, ExternalLink, Inbox, Activity, ArrowUpRight, ArrowDownRight,
  Pencil, Eye, CheckCircle2, Clock, Settings, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';

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
  { key: 'totalPosts' as const, label: 'Blog Posts', icon: FileText, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', trend: '+12%', up: true },
  { key: 'activeServices' as const, label: 'Services', icon: Briefcase, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', trend: '+3%', up: true },
  { key: 'activeTeam' as const, label: 'Team Members', icon: Users, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30', trend: '0%', up: true },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Mail, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', trend: '+5', up: true },
  { key: 'activePortfolio' as const, label: 'Portfolio', icon: FolderOpen, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30', trend: '+2', up: true },
  { key: 'activeTestimonials' as const, label: 'Testimonials', icon: MessageSquare, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', trend: '+1', up: true },
];

const monthlyInquiries = [
  { month: 'Jul', value: 14 },
  { month: 'Aug', value: 19 },
  { month: 'Sep', value: 12 },
  { month: 'Oct', value: 25 },
  { month: 'Nov', value: 21 },
  { month: 'Dec', value: 17 },
  { month: 'Jan', value: 23 },
];

const quickActions = [
  { label: 'New Blog Post', icon: Pencil, action: 'admin-blog-editor', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'New Service', icon: Plus, action: 'admin-services', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'View Messages', icon: Inbox, action: 'admin-messages', color: 'text-rose-600 dark:text-rose-400' },
];

const recentActivities = [
  { id: '1', text: 'New inquiry from Kwame Asante', time: '5 minutes ago', icon: Mail, iconColor: 'text-emerald-500' },
  { id: '2', text: 'Blog post "Web Dev Trends" published', time: '1 hour ago', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  { id: '3', text: 'Portfolio project "ERP System" updated', time: '3 hours ago', icon: FolderOpen, iconColor: 'text-amber-500' },
  { id: '4', text: 'Team member Abena Osei added', time: 'Yesterday', icon: Users, iconColor: 'text-violet-500' },
  { id: '5', text: 'Settings updated by admin', time: 'Yesterday', icon: Settings, iconColor: 'text-slate-400' },
  { id: '6', text: 'New testimonial from Ama Mensah', time: '2 days ago', icon: MessageSquare, iconColor: 'text-cyan-500' },
];

export default function AdminDashboard() {
  const { navigate } = useAppStore();
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

        // The stats API may be wrapped in {success, data}
        const rawStats = statsData.data || statsData;

        setStats({
          totalPosts: rawStats?.blog?.total || 0,
          activeServices: rawStats?.services?.active || 0,
          activeTeam: rawStats?.team?.total || 0,
          unreadMessages: rawStats?.messages?.unread || 0,
          activePortfolio: rawStats?.portfolio?.total || 0,
          activeTestimonials: rawStats?.testimonials?.total || 0,
        });
        setRecentPosts(Array.isArray(postsData) ? postsData : (postsData.data || []));
        setRecentMessages(Array.isArray(messagesData) ? messagesData : (messagesData.data || []));
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

  const maxInquiry = Math.max(...monthlyInquiries.map((d) => d.value));

  return (
    <div className="space-y-6">
      {/* Welcome + System Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, Admin</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your website today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="relative">
            <div className="size-2 rounded-full bg-emerald-500" />
            <div className="size-2 rounded-full bg-emerald-500 absolute inset-0 animate-ping opacity-75" />
          </div>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All Systems Operational</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key] || 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {card.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {card.trend}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts + Quick Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Inquiries Chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-500" />
                  Monthly Inquiries
                </CardTitle>
                <span className="text-xs text-muted-foreground">Last 7 months</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-end gap-3 h-40">
                {monthlyInquiries.map((item, i) => {
                  const height = (item.value / maxInquiry) * 100;
                  const isCurrentMonth = i === monthlyInquiries.length - 1;
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{item.value}</span>
                      <div className="w-full relative group">
                        <motion.div
                          className={`w-full rounded-t-md ${isCurrentMonth ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-emerald-300 dark:group-hover:bg-emerald-600'} transition-colors`}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                          style={{ minHeight: '4px' }}
                        />
                      </div>
                      <span className={`text-xs ${isCurrentMonth ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
                    onClick={() => navigate(action.action as Parameters<typeof navigate>[0])}
                  >
                    <Icon className={`size-4 ${action.color}`} />
                    <span className="text-sm">{action.label}</span>
                    <ArrowUpRight className="size-3 ml-auto text-muted-foreground" />
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent data tables + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent posts */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Recent Blog Posts
              </h2>
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
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                Recent Messages
              </h2>
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

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-border/50 h-full">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  Recent Activity
                </h2>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentActivities.map((activity, i) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                      <div className={`size-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`size-3.5 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{activity.text}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
