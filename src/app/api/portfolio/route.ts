import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/admin-auth';

const publicPortfolioSelect = {
  id: true,
  title: true,
  description: true,
  image: true,
  url: true,
  category: true,
  technologies: true,
  featured: true,
  active: true,
  order: true,
  caseStudyPublished: true,
  caseStudySlug: true,
  caseStudyClientName: true,
  caseStudyChallenge: true,
  caseStudySolution: true,
  caseStudyOutcomes: true,
  caseStudyPublishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET all portfolio projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');
    const featured = searchParams.get('featured');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    const adminRequest = (await isAdminRequest(request));

    if (!adminRequest || activeOnly === 'true') {
      where.active = true;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (category) {
      where.category = category;
    }

    const projects = await db.portfolioProject.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { order: 'asc' },
      ...(adminRequest ? {} : { select: publicPortfolioSelect }),
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching portfolio projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio projects' },
      { status: 500 }
    );
  }
}

// POST create portfolio project
const createPortfolioSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  url: z.string().optional().default(''),
  category: z.string().optional().default(''),
  technologies: z.string().optional().default('[]'),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
  caseStudyPublished: z.boolean().optional().default(false),
  caseStudySlug: z.string().trim().max(120).nullable().optional().default(null),
  caseStudyClientName: z.string().max(180).optional().default(''),
  caseStudyChallenge: z.string().max(12000).optional().default(''),
  caseStudySolution: z.string().max(12000).optional().default(''),
  caseStudyOutcomes: z.string().max(12000).optional().default(''),
  caseStudyApprovalReference: z.string().max(500).optional().default(''),
});

export async function POST(request: NextRequest) {
  if (!(await (await isAdminRequest(request)))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createPortfolioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = {
      ...parsed.data,
      caseStudySlug: parsed.data.caseStudySlug?.trim() || null,
      caseStudyPublishedAt: parsed.data.caseStudyPublished ? new Date() : null,
    };

    if (data.caseStudyPublished) {
      if (!data.caseStudySlug || !data.caseStudyChallenge.trim() || !data.caseStudySolution.trim() || !data.caseStudyOutcomes.trim() || !data.caseStudyApprovalReference.trim()) {
        return NextResponse.json(
          { success: false, error: 'Publishing a case study requires a slug, challenge, solution, outcomes and internal approval reference.' },
          { status: 400 },
        );
      }
    }

    const project = await db.portfolioProject.create({ data });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio project' },
      { status: 500 }
    );
  }
}
