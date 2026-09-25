import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/admin-auth';

// GET individual portfolio project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminRequest = await isAdminRequest(request);
    const project = adminRequest
      ? await db.portfolioProject.findUnique({ where: { id } })
      : await db.portfolioProject.findFirst({ where: { id, active: true } });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Portfolio project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching portfolio project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio project' },
      { status: 500 }
    );
  }
}

// PUT update portfolio project
const updatePortfolioSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  url: z.string().optional(),
  category: z.string().optional(),
  technologies: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  caseStudyPublished: z.boolean().optional(),
  caseStudySlug: z.string().trim().max(120).nullable().optional(),
  caseStudyClientName: z.string().max(180).optional(),
  caseStudyChallenge: z.string().max(12000).optional(),
  caseStudySolution: z.string().max(12000).optional(),
  caseStudyOutcomes: z.string().max(12000).optional(),
  caseStudyApprovalReference: z.string().max(500).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePortfolioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.portfolioProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Portfolio project not found' },
        { status: 404 }
      );
    }

    const next = {
      ...existing,
      ...parsed.data,
      caseStudySlug:
        parsed.data.caseStudySlug === undefined
          ? existing.caseStudySlug
          : parsed.data.caseStudySlug?.trim() || null,
    };

    if (next.caseStudyPublished) {
      if (!next.caseStudySlug || !next.caseStudyChallenge.trim() || !next.caseStudySolution.trim() || !next.caseStudyOutcomes.trim() || !next.caseStudyApprovalReference.trim()) {
        return NextResponse.json(
          { success: false, error: 'Publishing a case study requires a slug, challenge, solution, outcomes and internal approval reference.' },
          { status: 400 },
        );
      }
    }

    const project = await db.portfolioProject.update({
      where: { id },
      data: {
        ...parsed.data,
        caseStudySlug: next.caseStudySlug,
        caseStudyPublishedAt:
          next.caseStudyPublished && !existing.caseStudyPublished
            ? new Date()
            : !next.caseStudyPublished
              ? null
              : existing.caseStudyPublishedAt,
      },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error updating portfolio project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update portfolio project' },
      { status: 500 }
    );
  }
}

// DELETE portfolio project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await db.portfolioProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Portfolio project not found' },
        { status: 404 }
      );
    }

    await db.portfolioProject.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Portfolio project deleted' });
  } catch (error) {
    console.error('Error deleting portfolio project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete portfolio project' },
      { status: 500 }
    );
  }
}
