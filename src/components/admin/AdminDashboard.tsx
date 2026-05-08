'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Briefcase, Users, Mail, FolderOpen, MessageSquare,
  Plus, ExternalLink, Inbox, Activity, ArrowUpRight, ArrowDownRight,
  Pencil, Eye, CheckCircle2, Clock, Settings, TrendingUp, BarChart3, Timer, MousePointerClick
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
  { key: 'totalPosts' as const, label: 'Blog Posts', icon: FileText, color: 'text-emerald-600 bg-amber-100 dark:bg-amber-900/30', trend: '+12%', up: true, borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'activeServices' as const, label: 'Services', icon: Briefcase, color: 'text-emerald-600 bg-amber-100 dark:bg-amber-900/30', trend: '+3%', up: true, borderAccent: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' },
  { key: 'activeTeam' as const, label: 'Team Members', icon: Users, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', trend: '0%', up: true, borderAccent: 'border-l-[3px] border-l-yellow-500 dark:border-l-yellow-400' },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Mail, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', trend: '+5', up: true, borderAccent: 'border-l-[3px] border-l-rose-500 dark:border-l-rose-400' },
  { key: 'activePortfolio' as const, label: 'Portfolio', icon: FolderOpen, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30', trend: '+2', up: true, borderAccent: 'border-l-[3px] border-l-cyan-500 dark:border-l-cyan-400' },
  { key: 'activeTestimonials' as const, label: 'Testimonials', icon: MessageSquare, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', trend: '+1', up: true, borderAccent: 'border-l-[3px] border-l-orange-500 dark:border-l-orange-400' },
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
  { label: 'New Blog Post', icon: Pencil, action: 'admin-blog-editor', color: 'text-emerald-600 dark:text-amber-400' },
  { label: 'New Service', icon: Plus, action: 'admin-services', color: 'text-emerald-600 dark:text-amber-400' },
  { label: 'View Messages', icon: Inbox, action: 'admin-messages', color: 'text-rose-600 dark:text-rose-400' },
];

const recentActivities = [
  { id: '1', text: 'New inquiry from Kwame Asante', time: '5 minutes ago', icon: Mail, iconColor: 'text-amber-500' },
  { id: '2', text: 'Blog post "Web Dev Trends" published', time: '1 hour ago', icon: CheckCircle2, iconColor: 'text-amber-500' },
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
      {/* Welcome Banner */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700" />
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-amber-400/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 px-6 py-6 md:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, Admin!</h1>
            <p className="text-amber-100 mt-1 text-sm md:text-base">Here&apos;s what&apos;s happening today.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="relative">
              <div className="size-2 rounded-full bg-amber-300" />
              <div className="size-2 rounded-full bg-amber-300 absolute inset-0 animate-ping opacity-75" />
            </div>
            <span className="text-sm font-medium text-white">All Systems Operational</span>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row - Analytics Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: '3.2K', trend: '+12.5%', up: true, icon: BarChart3, color: 'text-emerald-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Bounce Rate', value: '34%', trend: '-2.1%', up: false, icon: MousePointerClick, color: 'text-emerald-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Avg Session', value: '2m 45s', trend: '+8.3%', up: true, icon: Timer, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
          { label: 'Conversion Rate', value: '4.8%', trend: '+1.2%', up: true, icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
            >
              <Card className="border-border/50 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon className={`size-4 ${item.color}`} />
                    </div>
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${item.up ? 'text-emerald-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                      {item.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {item.trend}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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
              <Card className={`border-border/50 hover:shadow-md transition-all duration-300 ${card.borderAccent}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-emerald-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
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
                  <TrendingUp className="size-4 text-amber-500" />
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
                      <span className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{item.value}</span>
                      <div className="w-full relative group">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {item.value} inquiries
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-200" />
                        </div>
                        <motion.div
                          className={`w-full rounded-t-lg ${isCurrentMonth ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-gradient-to-t group-hover:from-amber-600 group-hover:to-amber-400'} transition-all duration-300 cursor-pointer`}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                          style={{ minHeight: '4px' }}
                        />
                      </div>
                      <span className={`text-xs ${isCurrentMonth ? 'font-semibold text-emerald-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
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
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    className="w-full flex items-center justify-start gap-3 h-14 px-4 rounded-xl border border-border/50 bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800/80 dark:to-slate-800/40 hover:from-amber-50 hover:to-amber-50/30 dark:hover:from-amber-900/20 dark:hover:to-amber-900/10 hover:border-amber-300 dark:hover:border-emerald-500 hover:shadow-md transition-all duration-300 text-left"
                    onClick={() => navigate(action.action as Parameters<typeof navigate>[0])}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${i === 0 ? 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20' : i === 1 ? 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20' : 'from-rose-100 to-rose-50 dark:from-rose-900/40 dark:to-rose-900/20'}`}>
                      <Icon className={`size-4 ${action.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                    <ArrowUpRight className="size-3.5 ml-auto text-muted-foreground" />
                  </motion.button>
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
                    <TableRow key={post.id} className="hover:bg-emerald-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200">
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{post.title}</TableCell>
                      <TableCell>
                        {post.published ? (
                          <Badge className="bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">Published</Badge>
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
                    <TableRow key={msg.id} className={`hover:bg-emerald-50/50 dark:hover:bg-amber-900/5 transition-colors duration-200 ${!msg.read ? 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400' : ''}`}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-2">
                          {!msg.read && <span className="relative flex size-2 shrink-0"><span className="animate-ping absolute inline-flex size-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-amber-500" /></span>}
                          <span className={msg.read ? '' : 'font-bold'}>{msg.name}</span>
                        </span>
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
