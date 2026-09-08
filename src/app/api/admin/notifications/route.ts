import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const AUDIENCES = [
  "ALL",
  "RETAIL",
  "RESELLER",
  "INDIVIDUAL",
] as const;

type Audience =
  (typeof AUDIENCES)[number];

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function validInternalLink(
  value: string,
) {
  if (!value) {
    return true;
  }

  return (
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function recipientWhere(
  audience: Audience,
  targetUserId?: string | null,
) {
  if (
    audience ===
    "INDIVIDUAL"
  ) {
    return {
      id:
        targetUserId ||
        "__missing__",
      status:
        "ACTIVE" as const,
      role: {
        not:
          "ADMIN" as const,
      },
    };
  }

  if (
    audience ===
    "RESELLER"
  ) {
    return {
      status:
        "ACTIVE" as const,
      role: {
        not:
          "ADMIN" as const,
      },
      OR: [
        {
          role:
            "RESELLER" as const,
        },
        {
          isReseller:
            true,
        },
      ],
    };
  }

  if (
    audience ===
    "RETAIL"
  ) {
    return {
      status:
        "ACTIVE" as const,
      role:
        "CUSTOMER" as const,
      isReseller:
        false,
    };
  }

  return {
    status:
      "ACTIVE" as const,
    role: {
      not:
        "ADMIN" as const,
    },
  };
}

async function sendCampaign(
  campaignId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const campaign =
        await tx.notificationCampaign.findUnique({
          where: {
            id: campaignId,
          },
        });

      if (!campaign) {
        throw new Error(
          "Notification campaign not found.",
        );
      }

      if (
        campaign.status ===
        "SENT"
      ) {
        throw new Error(
          "This notification was already sent.",
        );
      }

      const recipients =
        await tx.user.findMany({
          where:
            recipientWhere(
              campaign.audience,
              campaign.targetUserId,
            ),
          select: {
            id: true,
          },
        });

      if (
        recipients.length === 0
      ) {
        throw new Error(
          "No eligible recipients found.",
        );
      }

      await tx.notification.createMany({
        data:
          recipients.map(
            (user) => ({
              userId:
                user.id,
              campaignId:
                campaign.id,
              title:
                campaign.title,
              message:
                campaign.message,
              link:
                campaign.link,
            }),
          ),
      });

      return tx.notificationCampaign.update({
        where: {
          id:
            campaign.id,
        },
        data: {
          status:
            "SENT",
          recipientCount:
            recipients.length,
          sentAt:
            new Date(),
        },
      });
    },
  );
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const [
      campaigns,
      customers,
    ] =
      await Promise.all([
        prisma.notificationCampaign.findMany({
          orderBy: {
            createdAt:
              "desc",
          },
          take: 100,
        }),

        prisma.user.findMany({
          where: {
            role: {
              not:
                "ADMIN",
            },
          },
          orderBy: [
            {
              name:
                "asc",
            },
            {
              createdAt:
                "desc",
            },
          ],
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isReseller:
              true,
          },
          take: 500,
        }),
      ]);

    return NextResponse.json({
      success: true,
      campaigns,
      customers,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/notifications failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load notifications.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const title =
      cleanString(
        body.title,
      );

    const message =
      cleanString(
        body.message,
      );

    const link =
      cleanString(
        body.link,
      );

    const audience =
      cleanString(
        body.audience,
      ).toUpperCase() as Audience;

    const targetUserId =
      cleanString(
        body.targetUserId,
      );

    const action =
      cleanString(
        body.action,
      ).toUpperCase() ||
      "SAVE_DRAFT";

    if (
      !title ||
      !message
    ) {
      return NextResponse.json(
        {
          error:
            "Title and message are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      title.length > 120
    ) {
      return NextResponse.json(
        {
          error:
            "Title must be 120 characters or less.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      message.length >
      1000
    ) {
      return NextResponse.json(
        {
          error:
            "Message must be 1000 characters or less.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !AUDIENCES.includes(
        audience,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid notification audience.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      audience ===
        "INDIVIDUAL" &&
      !targetUserId
    ) {
      return NextResponse.json(
        {
          error:
            "Select a customer for an individual notification.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validInternalLink(
        link,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Notification link must be an internal path starting with /.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !==
        "SAVE_DRAFT" &&
      action !==
        "SEND"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid notification action.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      audience ===
      "INDIVIDUAL"
    ) {
      const customer =
        await prisma.user.findFirst({
          where: {
            id:
              targetUserId,
            role: {
              not:
                "ADMIN",
            },
          },
          select: {
            id: true,
          },
        });

      if (!customer) {
        return NextResponse.json(
          {
            error:
              "Selected customer was not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    const campaign =
      await prisma.notificationCampaign.create({
        data: {
          title,
          message,
          link:
            link || null,
          audience,
          targetUserId:
            audience ===
            "INDIVIDUAL"
              ? targetUserId
              : null,
        },
      });

    if (
      action === "SEND"
    ) {
      try {
        const sent =
          await sendCampaign(
            campaign.id,
          );

        return NextResponse.json(
          {
            success: true,
            campaign:
              sent,
            message:
              `Notification sent to ${sent.recipientCount} recipient(s).`,
          },
          {
            status: 201,
          },
        );
      } catch (error) {
        await prisma.notificationCampaign.delete({
          where: {
            id:
              campaign.id,
          },
        });

        throw error;
      }
    }

    return NextResponse.json(
      {
        success: true,
        campaign,
        message:
          "Notification draft saved.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/notifications failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create notification.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    const action =
      cleanString(
        body.action,
      ).toUpperCase();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Campaign ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.notificationCampaign.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Notification campaign not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      existing.status ===
      "SENT"
    ) {
      return NextResponse.json(
        {
          error:
            "Sent notifications cannot be edited or sent again.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      action === "SEND"
    ) {
      const sent =
        await sendCampaign(
          id,
        );

      return NextResponse.json({
        success: true,
        campaign:
          sent,
        message:
          `Notification sent to ${sent.recipientCount} recipient(s).`,
      });
    }

    const title =
      body.title ===
      undefined
        ? existing.title
        : cleanString(
            body.title,
          );

    const message =
      body.message ===
      undefined
        ? existing.message
        : cleanString(
            body.message,
          );

    const link =
      body.link ===
      undefined
        ? existing.link ||
          ""
        : cleanString(
            body.link,
          );

    const audience =
      body.audience ===
      undefined
        ? existing.audience
        : cleanString(
            body.audience,
          ).toUpperCase() as Audience;

    const targetUserId =
      body.targetUserId ===
      undefined
        ? existing.targetUserId ||
          ""
        : cleanString(
            body.targetUserId,
          );

    if (
      !title ||
      !message
    ) {
      return NextResponse.json(
        {
          error:
            "Title and message are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !AUDIENCES.includes(
        audience,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid notification audience.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validInternalLink(
        link,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Notification link must be an internal path starting with /.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      audience ===
        "INDIVIDUAL" &&
      !targetUserId
    ) {
      return NextResponse.json(
        {
          error:
            "Select a customer.",
        },
        {
          status: 400,
        },
      );
    }

    const updated =
      await prisma.notificationCampaign.update({
        where: {
          id,
        },
        data: {
          title,
          message,
          link:
            link || null,
          audience,
          targetUserId:
            audience ===
            "INDIVIDUAL"
              ? targetUserId
              : null,
        },
      });

    return NextResponse.json({
      success: true,
      campaign:
        updated,
      message:
        "Draft updated.",
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/notifications failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update notification.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Campaign ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const campaign =
      await prisma.notificationCampaign.findUnique({
        where: {
          id,
        },
      });

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Notification campaign not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      campaign.status ===
      "SENT"
    ) {
      return NextResponse.json(
        {
          error:
            "Sent notification history cannot be deleted.",
        },
        {
          status: 409,
        },
      );
    }

    await prisma.notificationCampaign.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Draft deleted.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/notifications failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete notification draft.",
      },
      {
        status: 500,
      },
    );
  }
}
