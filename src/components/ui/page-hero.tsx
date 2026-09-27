'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  page?: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  children?: React.ReactNode;
}

function EnterpriseMotionGraphic({ reduceMotion }: { reduceMotion: boolean | null }) {
  const animate = !reduceMotion;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Slow aurora wash: visible enough to give depth without competing with content. */}
      <motion.div
        className="absolute -inset-[35%] opacity-80"
        style={{
          background:
            'radial-gradient(circle at 68% 42%, rgba(245,158,11,0.16), transparent 19%), radial-gradient(circle at 78% 58%, rgba(52,211,153,0.13), transparent 23%), radial-gradient(circle at 42% 20%, rgba(59,130,246,0.08), transparent 20%)',
          filter: 'blur(18px)',
        }}
        animate={animate ? { x: ['-2%', '3%', '-2%'], y: ['-2%', '2%', '-2%'], scale: [1, 1.05, 1] } : undefined}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Travelling light beam creates restrained motion on every inner-page hero. */}
      <motion.div
        className="absolute -top-1/3 h-[170%] w-[26%] -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent blur-2xl"
        initial={animate ? { x: '-150vw' } : false}
        animate={animate ? { x: '520vw' } : undefined}
        transition={{ duration: 16, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
      />

      {/* Enterprise network / circuit visual. Kept to the right so headings stay dominant. */}
      <motion.svg
        viewBox="0 0 520 330"
        className="absolute right-[-72px] top-1/2 hidden h-[320px] w-[520px] -translate-y-1/2 opacity-60 lg:block xl:right-[2%]"
        fill="none"
        animate={animate ? { y: [-4, 5, -4] } : undefined}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="lw-page-hero-line" x1="40" y1="30" x2="460" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" stopOpacity=".18" />
            <stop offset=".52" stopColor="#fbbf24" stopOpacity=".72" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity=".08" />
          </linearGradient>
          <radialGradient id="lw-page-hero-core">
            <stop stopColor="#fbbf24" stopOpacity=".35" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.circle
          cx="330"
          cy="165"
          r="124"
          stroke="url(#lw-page-hero-line)"
          strokeWidth="1"
          strokeDasharray="3 10"
          animate={animate ? { rotate: 360 } : undefined}
          transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '330px 165px' }}
        />
        <motion.circle
          cx="330"
          cy="165"
          r="88"
          stroke="#fbbf24"
          strokeOpacity=".2"
          strokeWidth="1"
          strokeDasharray="38 18 6 14"
          animate={animate ? { rotate: -360 } : undefined}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '330px 165px' }}
        />
        <circle cx="330" cy="165" r="54" fill="url(#lw-page-hero-core)" />

        {[
          'M62 74 H178 L230 126 H292',
          'M28 166 H150 L208 166 H276',
          'M84 262 H178 L232 208 H294',
          'M330 41 V92',
          'M330 238 V294',
          'M418 165 H492',
        ].map((d, index) => (
          <motion.path
            key={d}
            d={d}
            stroke="url(#lw-page-hero-line)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="8 10"
            animate={animate ? { strokeDashoffset: [0, -36] } : undefined}
            transition={{ duration: 5 + index * 0.45, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {[
          [62, 74],
          [28, 166],
          [84, 262],
          [330, 41],
          [330, 294],
          [492, 165],
          [230, 126],
          [232, 208],
        ].map(([cx, cy], index) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={index < 6 ? 4 : 3}
            fill={index % 2 === 0 ? '#34d399' : '#fbbf24'}
            animate={animate ? { opacity: [0.35, 1, 0.35], r: [3, 5, 3] } : undefined}
            transition={{ duration: 2.8 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.svg>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.2)_0%,rgba(15,23,42,.04)_55%,rgba(15,23,42,.16)_100%)]" />
    </div>
  );
}

export default function PageHero({
  title,
  subtitle,
  badge,
  breadcrumbs,
  className,
  children,
}: PageHeroProps) {
  const { navigate } = useAppStore();
  const reduceMotion = useReducedMotion();

  const defaultBreadcrumbs = breadcrumbs ?? [
    { label: 'Home', page: 'home' },
    { label: title.replace(/ Lightworld Technologies/gi, '').trim() },
  ];

  const entrance = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section
      className={cn(
        'relative overflow-hidden py-20 md:py-28',
        'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        className,
      )}
    >
      {/* Structured depth layers; animation intentionally remains slow and non-distracting. */}
      <div className="absolute inset-0 grid-pattern opacity-[0.055]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(245,158,11,.10),transparent_30%),radial-gradient(circle_at_82%_75%,rgba(52,211,153,.08),transparent_32%)]" aria-hidden="true" />
      <EnterpriseMotionGraphic reduceMotion={reduceMotion} />

      <div className="container-main relative z-10">
        <motion.nav
          {...entrance(0)}
          className="mb-6 flex items-center gap-2 text-sm text-slate-400"
          aria-label="Breadcrumb"
        >
          {defaultBreadcrumbs.map((item, i) => (
            <span key={`${item.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-600">/</span>}
              {item.page ? (
                <button
                  onClick={() => navigate(item.page as any)}
                  className="transition-colors hover:text-amber-300"
                >
                  {item.label}
                </button>
              ) : (
                <span className="font-medium text-amber-300">{item.label}</span>
              )}
            </span>
          ))}
        </motion.nav>

        {badge && (
          <motion.div
            {...entrance(0.08)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-200 shadow-[0_0_35px_rgba(245,158,11,.08)] backdrop-blur-sm"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-300 opacity-45 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-300" />
            </span>
            {badge}
          </motion.div>
        )}

        <motion.h1
          {...entrance(0.12)}
          className="mb-4 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            {...entrance(0.2)}
            className="max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl"
          >
            {subtitle}
          </motion.p>
        )}

        {children && (
          <motion.div {...entrance(0.28)}>
            {children}
          </motion.div>
        )}
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-px w-full origin-left bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
        initial={reduceMotion ? false : { scaleX: 0.2, opacity: 0.25 }}
        animate={{ scaleX: 1, opacity: 0.8 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050810] to-transparent" aria-hidden="true" />
    </section>
  );
}