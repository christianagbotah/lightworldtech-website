'use client';

import { useState } from 'react';
import { Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = [
    {
      name: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
      color: 'hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500',
    },
    {
      name: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      color: 'hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600',
    },
    {
      name: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
      color: 'hover:bg-sky-700 hover:text-white dark:hover:bg-sky-700',
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5">
        {shareLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Tooltip key={link.name}>
              <TooltipTrigger asChild>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  className={`size-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all duration-200 ${link.color} hover:border-transparent hover:shadow-md`}
                >
                  <Icon className="size-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {link.name}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopyLink}
              aria-label={copied ? 'Copied!' : 'Copy link'}
              className={`size-9 rounded-full flex items-center justify-center border transition-all duration-200 ${
                copied
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-md'
              }`}
            >
              {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {copied ? 'Copied!' : 'Copy link'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
