import {
  getAuthenticatedAdmin,
  requireAdmin,
} from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin =
      await getAuthenticatedAdmin();

    const categories =
      await prisma.category.findMany({
        where: {
          parentId: null,
          ...(admin
            ? {}
            : {
                isActive: true,
              }),
        },
        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          children: {
            ...(admin
              ? {}
              : {
                  where: {
                    isActive: true,
                  },
                }),
            orderBy: [
              { sortOrder: "asc" },
              { name: "asc" },
            ],
            include: {
              _count: {
                select: {
                  products: true,
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories failed:", error);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  /* ADMIN_GUARD_POST */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const parentId =
      body.parentId && String(body.parentId).trim()
        ? String(body.parentId)
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    if (parentId) {
      const parent =
        await prisma.category.findUnique({
          where: {
            id: parentId,
          },
          select: {
            id: true,
            parentId: true,
          },
        });

      if (!parent) {
        return NextResponse.json(
          {
            error:
              "Parent category not found",
          },
          { status: 404 },
        );
      }

      if (parent.parentId !== null) {
        return NextResponse.json(
          {
            error:
              "Parent must be a main category",
          },
          { status: 400 },
        );
      }
    }

    const slugBase =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      "category";

    const slug =
      `${slugBase}-${Date.now()}`;

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId,
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories failed:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
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
      String(
        body.id ?? "",
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Category id is required",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.category.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
          _count: {
            select: {
              children: true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Category not found",
        },
        { status: 404 },
      );
    }

    let name:
      | string
      | undefined;

    if (
      body.name !== undefined
    ) {
      name =
        String(
          body.name,
        ).trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "Category name is required",
          },
          { status: 400 },
        );
      }
    }

    let parentId:
      | string
      | null
      | undefined;

    if (
      body.parentId !== undefined
    ) {
      parentId =
        body.parentId &&
        String(
          body.parentId,
        ).trim()
          ? String(
              body.parentId,
            ).trim()
          : null;

      if (parentId === id) {
        return NextResponse.json(
          {
            error:
              "A category cannot be its own parent",
          },
          { status: 400 },
        );
      }

      if (parentId) {
        const parent =
          await prisma.category.findUnique({
            where: {
              id: parentId,
            },
            select: {
              id: true,
              parentId: true,
            },
          });

        if (!parent) {
          return NextResponse.json(
            {
              error:
                "Parent category not found",
            },
            { status: 404 },
          );
        }

        if (
          parent.parentId !== null
        ) {
          return NextResponse.json(
            {
              error:
                "Parent must be a main category",
            },
            { status: 400 },
          );
        }

        if (
          existing._count.children >
          0
        ) {
          return NextResponse.json(
            {
              error:
                "A category with subcategories cannot be moved under another category",
            },
            { status: 400 },
          );
        }
      }
    }

    let sortOrder:
      | number
      | undefined;

    if (
      body.sortOrder !==
      undefined
    ) {
      sortOrder =
        Number(
          body.sortOrder,
        );

      if (
        !Number.isFinite(
          sortOrder,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid sort order",
          },
          { status: 400 },
        );
      }

      sortOrder =
        Math.trunc(
          sortOrder,
        );
    }

    const category =
      await prisma.category.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && {
            name,
          }),

          ...(parentId !==
            undefined && {
            parentId,
          }),

          ...(body.isActive !==
            undefined && {
            isActive:
              Boolean(
                body.isActive,
              ),
          }),

          ...(sortOrder !==
            undefined && {
            sortOrder,
          }),
        },
      });

    return NextResponse.json(
      category,
    );
  } catch (error) {
    console.error(
      "PATCH /api/categories failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update category",
      },
      { status: 500 },
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
      String(
        body.id ?? "",
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Category id is required",
        },
        { status: 400 },
      );
    }

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          isActive: true,
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Category not found",
        },
        { status: 404 },
      );
    }

    if (
      category._count.products >
        0 ||
      category._count.children >
        0
    ) {
      const updated =
        await prisma.category.update({
          where: {
            id,
          },
          data: {
            isActive: false,
          },
        });

      return NextResponse.json({
        message:
          "Category has products or subcategories, so it was deactivated",
        category: updated,
      });
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message:
        "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/categories failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete category",
      },
      { status: 500 },
    );
  }
}
