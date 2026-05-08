import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const projects = await db.portfolioProject.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, image, url, category, technologies, featured, active, order } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const project = await db.portfolioProject.create({
      data: {
        title, description: description || '', image: image || '',
        url: url || '', category: category || '',
        technologies: technologies || '[]',
        featured: featured || false, active: active !== false, order: order || 0,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
