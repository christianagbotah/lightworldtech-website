import { z } from 'zod';

const singleLine = (label: string, max: number) =>
  z.string().trim().min(1, label + ' is required').max(max).refine(
    (value) => !/[\r\n]/.test(value),
    label + ' must be a single line',
  );

export const careersApplicationSchema = z.object({
  name: singleLine('Name', 120),
  email: z.string().trim().max(254).email('Valid email is required').transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(50).refine((value) => !/[\r\n]/.test(value), 'Phone must be a single line').optional().default(''),
  position: singleLine('Position', 160),
  coverLetter: z.string().trim().max(8000).optional().default(''),
  resumeUrl: z.string().trim().max(2048).optional().default('').refine((value) => {
    if (!value) return true;
    if (/^\/uploads\/[a-f0-9]{32}\.(?:jpg|png|gif|webp)$/i.test(value)) return true;

    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Resume URL must use HTTP(S) or a managed upload URL'),
});

export type CareersApplication = z.infer<typeof careersApplicationSchema>;

export function careersApplicationMessage(input: CareersApplication): string {
  const resume = input.resumeUrl || 'Not uploaded';
  return input.coverLetter
    ? input.coverLetter + '\n\n---\nResume: ' + resume
    : 'Position: ' + input.position + '\nResume: ' + resume;
}
