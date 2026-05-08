import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, position, coverLetter, resumeUrl } = body;

    if (!name || !email || !position) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and position are required.' },
        { status: 400 }
      );
    }

    // Store as a contact message with careers tag
    await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || '',
        subject: `Job Application: ${position}`,
        message: coverLetter
          ? `${coverLetter}\n\n---\nResume: ${resumeUrl || 'Not uploaded'}`
          : `Position: ${position}\nResume: ${resumeUrl || 'Not uploaded'}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully!',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit application.' },
      { status: 500 }
    );
  }
}
