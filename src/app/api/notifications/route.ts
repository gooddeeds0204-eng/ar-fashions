import {
  NextResponse,
} from "next/server";
import {
  cookies,
} from "next/headers";
import {
  prisma,
} from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

async function getUserId() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      CUSTOMER_SESSION_COOKIE,
    )?.value;

  return verifyCustomerSessionToken(
    token,
  );
}

export async function GET() {
  try {
    const userId =
      await getUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to view notifications.",
        },
        {
          status: 401,
        },
      );
    }

    const [
      notifications,
      unreadCount,
    ] =
      await Promise.all([
        prisma.notification.findMany({
          where: {
            userId,
          },
          orderBy: {
            createdAt:
              "desc",
          },
          take: 100,
          select: {
            id: true,
            title: true,
            message: true,
            link: true,
            isRead: true,
            readAt: true,
            createdAt:
              true,
          },
        }),

        prisma.notification.count({
          where: {
            userId,
            isRead:
              false,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      count:
        notifications.length,
    });
  } catch (error) {
    console.error(
      "GET /api/notifications failed:",
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

export async function PATCH(
  request: Request,
) {
  try {
    const userId =
      await getUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const action =
      String(
        body.action ??
          "",
      )
        .trim()
        .toUpperCase();

    if (
      action ===
      "MARK_ALL_READ"
    ) {
      const result =
        await prisma.notification.updateMany({
          where: {
            userId,
            isRead:
              false,
          },
          data: {
            isRead:
              true,
            readAt:
              new Date(),
          },
        });

      return NextResponse.json({
        success: true,
        updated:
          result.count,
      });
    }

    if (
      action ===
      "MARK_READ"
    ) {
      const id =
        String(
          body.id ??
            "",
        ).trim();

      if (!id) {
        return NextResponse.json(
          {
            error:
              "Notification ID is required.",
          },
          {
            status: 400,
          },
        );
      }

      const result =
        await prisma.notification.updateMany({
          where: {
            id,
            userId,
          },
          data: {
            isRead:
              true,
            readAt:
              new Date(),
          },
        });

      if (
        result.count !== 1
      ) {
        return NextResponse.json(
          {
            error:
              "Notification not found.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid notification action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "PATCH /api/notifications failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update notification.",
      },
      {
        status: 500,
      },
    );
  }
}
