import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

// GET dashboard statistics
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      totalPosts,
      publishedPosts,
      totalServices,
      activeServices,
      totalTeamMembers,
      totalTestimonials,
      unreadMessages,
      totalMessages,
      totalFaqs,
      totalPortfolioProjects,
      totalSubscribers,
      totalCategories,
      totalLeads,
      openLeads,
      highPriorityLeads,
    ] = await Promise.all([
      db.blogPost.count(),
      db.blogPost.count({ where: { published: true } }),
      db.service.count(),
      db.service.count({ where: { active: true } }),
      db.teamMember.count(),
      db.testimonial.count(),
      db.contactMessage.count({ where: { read: false } }),
      db.contactMessage.count(),
      db.fAQ.count(),
      db.portfolioProject.count(),
      db.newsletterSubscriber.count({ where: { active: true } }),
      db.blogCategory.count(),
      db.lead.count(),
      db.lead.count({ where: { status: { notIn: ['won', 'lost'] } } }),
      db.lead.count({ where: { priority: 'high', status: { notIn: ['won', 'lost'] } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        blog: {
          total: totalPosts,
          published: publishedPosts,
          drafts: totalPosts - publishedPosts,
        },
        services: {
          total: totalServices,
          active: activeServices,
        },
        team: {
          total: totalTeamMembers,
        },
        testimonials: {
          total: totalTestimonials,
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages,
        },
        faqs: {
          total: totalFaqs,
        },
        portfolio: {
          total: totalPortfolioProjects,
        },
        newsletter: {
          totalSubscribers: totalSubscribers,
        },
        categories: {
          total: totalCategories,
        },
        leads: {
          total: totalLeads,
          open: openLeads,
          highPriority: highPriorityLeads,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
