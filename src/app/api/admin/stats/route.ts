import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { getCrmSummary } from '@/lib/crm';
import { hasAdminPermission } from '@/lib/admin-permissions';

// GET dashboard statistics, scoped to the administrator's live permissions.
export async function GET(request: NextRequest) {
  const admin = await getActiveAdminContext(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canSite = hasAdminPermission(admin.role, admin.permissions, 'site.manage');
  const canCrm = hasAdminPermission(admin.role, admin.permissions, 'crm.manage');
  const canCommunications = hasAdminPermission(
    admin.role,
    admin.permissions,
    'communications.manage',
  );

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
      crm,
    ] = await Promise.all([
      canSite ? db.blogPost.count() : Promise.resolve(0),
      canSite ? db.blogPost.count({ where: { published: true } }) : Promise.resolve(0),
      canSite ? db.service.count() : Promise.resolve(0),
      canSite ? db.service.count({ where: { active: true } }) : Promise.resolve(0),
      canSite ? db.teamMember.count() : Promise.resolve(0),
      canSite ? db.testimonial.count() : Promise.resolve(0),
      canCrm ? db.contactMessage.count({ where: { read: false } }) : Promise.resolve(0),
      canCrm ? db.contactMessage.count() : Promise.resolve(0),
      canSite ? db.fAQ.count() : Promise.resolve(0),
      canSite ? db.portfolioProject.count() : Promise.resolve(0),
      canCommunications
        ? db.newsletterSubscriber.count({ where: { active: true } })
        : Promise.resolve(0),
      canSite ? db.blogCategory.count() : Promise.resolve(0),
      canCrm ? getCrmSummary() : Promise.resolve({
        total: 0,
        open: 0,
        won: 0,
        lost: 0,
        highPriority: 0,
        overdueFollowUps: 0,
        byStatus: {
          new: 0,
          qualified: 0,
          discovery: 0,
          proposal: 0,
          negotiation: 0,
          won: 0,
          lost: 0,
        },
      }),
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
          totalSubscribers,
        },
        categories: {
          total: totalCategories,
        },
        crm,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 },
    );
  }
}
