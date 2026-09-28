'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics-client';

type ProjectType = 'website' | 'mobile' | 'enterprise' | 'ai' | 'cloud';
type Scale = 'focused' | 'departmental' | 'customer' | 'platform';

const projectTypes: Array<{ id: ProjectType; label: string; note: string; score: number }> = [
  { id: 'website', label: 'Website / digital experience', note: 'Corporate, portal, commerce or conversion-focused experience', score: 1 },
  { id: 'mobile', label: 'Mobile application', note: 'Native-feeling iOS / Android experience with backend services', score: 3 },
  { id: 'enterprise', label: 'Enterprise software', note: 'ERP, EAM, workflow, operations or business-management platform', score: 4 },
  { id: 'ai', label: 'AI & automation', note: 'AI assistants, intelligent workflows, decision support or automation', score: 4 },
  { id: 'cloud', label: 'Cloud / DevOps / security', note: 'Infrastructure, hardening, migration, reliability or security engineering', score: 3 },
];

const scales: Array<{ id: Scale; label: string; note: string; score: number }> = [
  { id: 'focused', label: 'Focused', note: 'One team or a clear single-purpose experience', score: 0 },
  { id: 'departmental', label: 'Multi-department', note: 'Several roles, workflows or business units', score: 2 },
  { id: 'customer', label: 'Customer-facing', note: 'External users, transactions, scale or support requirements', score: 3 },
  { id: 'platform', label: 'Platform / multi-tenant', note: 'Multiple organisations, products, regions or complex permissions', score: 5 },
];

const features = [
  { id: 'auth', label: 'Authentication & role permissions', score: 1 },
  { id: 'payments', label: 'Payments, billing or subscriptions', score: 2 },
  { id: 'workflow', label: 'Approvals & workflow automation', score: 2 },
  { id: 'offline', label: 'Offline / PWA capability', score: 2 },
  { id: 'integrations', label: 'External APIs & integrations', score: 2 },
  { id: 'ai', label: 'AI-enabled features', score: 3 },
  { id: 'analytics', label: 'Dashboards, reports & analytics', score: 1 },
  { id: 'migration', label: 'Legacy data / system migration', score: 3 },
  { id: 'security', label: 'Advanced security / audit controls', score: 2 },
  { id: 'multiregion', label: 'Multi-region / multi-currency', score: 2 },
] as const;

const timelineOptions = [
  'As soon as practical',
  'Within 1 month',
  '1 – 3 months',
  '3 – 6 months',
  '6+ months',
  'Still exploring',
];

const currencyOptions = ['GHS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED'];
const budgetOptions = ['Under 5,000', '5,000 – 15,000', '15,000 – 50,000', '50,000 – 150,000', '150,000+', 'Need help estimating'];
const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.07] dark:bg-[#0c141b] dark:text-white';

function serviceName(type: ProjectType) {
  return projectTypes.find((item) => item.id === type)?.label || 'Enterprise software';
}

function complexityFor(score: number) {
  if (score <= 4) return { label: 'Foundation', delivery: 'Focused delivery', range: 'Typically 4–8 weeks', team: 'Lean specialist team' };
  if (score <= 9) return { label: 'Professional', delivery: 'Structured product delivery', range: 'Typically 2–4 months', team: 'Cross-functional delivery team' };
  if (score <= 15) return { label: 'Advanced', delivery: 'Phased solution delivery', range: 'Typically 4–8 months', team: 'Senior multi-discipline team' };
  return { label: 'Enterprise', delivery: 'Programme-style delivery', range: 'Phased roadmap, often 6+ months', team: 'Dedicated programme team' };
}

export default function ProjectEstimatorPage() {
  const router = useRouter();
  const [projectType, setProjectType] = useState<ProjectType>('enterprise');
  const [scale, setScale] = useState<Scale>('departmental');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['auth', 'workflow', 'analytics']);
  const [timeline, setTimeline] = useState('1 – 3 months');
  const [currency, setCurrency] = useState('GHS');
  const [budget, setBudget] = useState('Need help estimating');
  const [goal, setGoal] = useState('');
  const [users, setUsers] = useState('');

  const estimate = useMemo(() => {
    const typeScore = projectTypes.find((item) => item.id === projectType)?.score || 0;
    const scaleScore = scales.find((item) => item.id === scale)?.score || 0;
    const featureScore = features
      .filter((item) => selectedFeatures.includes(item.id))
      .reduce((total, item) => total + item.score, 0);
    const urgencyScore = timeline === 'Within 1 month' ? 3 : timeline === 'As soon as practical' ? 2 : 0;
    const score = typeScore + scaleScore + featureScore + urgencyScore;
    return { score, ...complexityFor(score) };
  }, [projectType, scale, selectedFeatures, timeline]);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const continueToContact = () => {
    const featureLabels = features
      .filter((item) => selectedFeatures.includes(item.id))
      .map((item) => item.label);

    const brief = [
      'Project scope prepared with the Lightworld Project Estimator',
      '',
      'Project type: ' + serviceName(projectType),
      'Scale: ' + (scales.find((item) => item.id === scale)?.label || scale),
      'Indicative complexity: ' + estimate.label,
      'Delivery shape: ' + estimate.delivery,
      'Planning window: ' + estimate.range,
      'Preferred timeline: ' + timeline,
      'Budget context: ' + currency + ' ' + budget,
      goal.trim() ? 'Primary outcome: ' + goal.trim() : '',
      users.trim() ? 'Primary users: ' + users.trim() : '',
      featureLabels.length ? 'Required capabilities: ' + featureLabels.join(', ') : '',
      '',
      'This is a planning brief, not a binding quotation.',
    ].filter(Boolean).join('\n');

    try {
      sessionStorage.setItem('lw-project-brief', brief);
      sessionStorage.setItem('lw-project-brief-data', JSON.stringify({
        source: 'estimator',
        service: serviceName(projectType),
        goal: goal.trim(),
        users: users.trim(),
        timeline,
        complexity: estimate.label,
        currency,
        budget,
        features: featureLabels,
      }));
    } catch {
      // Contact remains available even if browser storage is disabled.
    }

    trackEvent('project_estimator_complete', {
      metadata: {
        service: projectType,
        complexity: estimate.label,
        featureCount: selectedFeatures.length,
      },
    });
    router.push('/contact');
  };

  return (
    <div className="overflow-hidden bg-[#f7f9f8] text-slate-950 dark:bg-[#050b10] dark:text-white">
      <section className="lw-hero-grid relative overflow-hidden border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="container-main relative z-10 py-16 sm:py-20 lg:py-24">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-amber-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <WandSparkles className="size-3.5" />
                Project scope builder
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Turn an idea into a clearer project brief.
              </h1>
            </div>
            <div className="max-w-xl">
              <p className="text-base leading-7 text-slate-600 dark:text-white/45 sm:text-lg sm:leading-8">
                Select the shape of the work, the capabilities you need and your delivery context. We will create an indicative scope profile you can send straight into a project conversation.
              </p>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400 dark:text-white/30">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                This tool provides planning guidance only. Final scope, timeline and commercial terms are confirmed after discovery.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main grid gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
          <div className="space-y-5">
            <EstimatorSection number="01" title="What are you planning?" description="Choose the closest project category. We can refine the technical solution later.">
              <div className="grid gap-3 md:grid-cols-2">
                {projectTypes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={projectType === item.id}
                    onClick={() => setProjectType(item.id)}
                    className={
                      'rounded-[22px] border p-4 text-left transition ' +
                      (projectType === item.id
                        ? 'border-amber-500/45 bg-amber-500/[0.08] shadow-sm'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.12]')
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-white/34">{item.note}</p>
                      </div>
                      <span className={'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border ' + (projectType === item.id ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 text-transparent dark:border-white/10')}>
                        <Check className="size-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </EstimatorSection>

            <EstimatorSection number="02" title="How broad is the solution?" description="This helps distinguish a focused build from a business-wide platform.">
              <div className="grid gap-3 sm:grid-cols-2">
                {scales.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={scale === item.id}
                    onClick={() => setScale(item.id)}
                    className={
                      'rounded-[22px] border p-4 text-left transition ' +
                      (scale === item.id
                        ? 'border-amber-500/45 bg-amber-500/[0.08]'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.02]')
                    }
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-white/34">{item.note}</p>
                  </button>
                ))}
              </div>
            </EstimatorSection>

            <EstimatorSection number="03" title="Which capabilities matter?" description="Select everything that is already known. Unselected items can still be added during discovery.">
              <div className="grid gap-2 sm:grid-cols-2">
                {features.map((item) => {
                  const selected = selectedFeatures.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleFeature(item.id)}
                      className={
                        'flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ' +
                        (selected
                          ? 'border-amber-500/40 bg-amber-500/[0.08]'
                          : 'border-slate-200/80 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]')
                      }
                    >
                      <span className={'flex size-5 shrink-0 items-center justify-center rounded-md border ' + (selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 text-transparent dark:border-white/15')}>
                        <Check className="size-3" />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </EstimatorSection>

            <EstimatorSection number="04" title="Delivery and commercial context" description="These details help us make the first conversation more useful.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred timeline">
                  <select value={timeline} onChange={(event) => setTimeline(event.target.value)} className={inputClass}>
                    {timelineOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Planning currency">
                  <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClass}>
                    {currencyOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Budget context">
                  <select value={budget} onChange={(event) => setBudget(event.target.value)} className={inputClass}>
                    {budgetOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Primary users">
                  <input value={users} onChange={(event) => setUsers(event.target.value)} className={inputClass} placeholder="e.g. staff, customers, field teams" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="What business outcome matters most?">
                    <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className={inputClass + ' min-h-28 resize-y py-3'} placeholder="Describe the problem, opportunity or result you want the project to achieve." />
                  </Field>
                </div>
              </div>
            </EstimatorSection>
          </div>

          <aside className="xl:sticky xl:top-24">
            <div className="rounded-[30px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 dark:border-white/[0.08] dark:bg-[#09131c]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/75">Indicative scope profile</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{estimate.label}</h2>
                </div>
                <span className="flex size-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                  <Gauge className="size-5" />
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                <ResultRow icon={Layers3} label="Delivery shape" value={estimate.delivery} />
                <ResultRow icon={Clock3} label="Planning window" value={estimate.range} />
                <ResultRow icon={Sparkles} label="Team shape" value={estimate.team} />
                <ResultRow icon={CheckCircle2} label="Selected capabilities" value={selectedFeatures.length + ' selected'} />
              </div>

              <div className="mt-6 rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-xs leading-6 text-white/48">
                  The profile updates as you change the scope. It is intentionally conservative: discovery may simplify the solution or reveal additional requirements.
                </p>
              </div>

              <button
                type="button"
                onClick={continueToContact}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Send this brief to Lightworld
                <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-center text-[10px] leading-5 text-white/28">
                Your selections are transferred to the project enquiry form. Nothing is submitted until you review and send it.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function EstimatorSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-7">
      <div className="mb-5 flex gap-4">
        <span className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-amber-600 dark:text-amber-300">{number}</span>
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-white/36">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="lw-public-form-field block">
      <span className="block text-xs font-semibold text-slate-600 dark:text-white/52">{label}</span>
      {children}
    </label>
  );
}

function ResultRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-amber-300">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">{label}</p>
        <p className="mt-1 text-sm font-semibold text-white/78">{value}</p>
      </div>
    </div>
  );
}