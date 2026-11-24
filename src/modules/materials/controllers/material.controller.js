
const { prisma } = require("../../../config/database");
const { z } = require("zod");

const uuidSchema = z.string().uuid();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  content: z.string().nullish(),
  category: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(100),
  level: z.string().max(100).nullish(),
  imageUrl: z.url().nullish(),
  resourceUrl: z.url().nullish(),
  duration: z.string().max(100).nullish(),
  featured: z.boolean().optional(),
}).strict();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().max(200).optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  level: z.string().optional(),
  sort: z.enum(["newest", "oldest", "title"]).default("newest"),
});

function sendError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function getMaterialId(req, res) {
  const result = uuidSchema.safeParse(req.params.materialId);

  if (!result.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid material ID.");
    return null;
  }

  return result.data;
}

function getListQuery(req, res) {
  const result = listSchema.safeParse(req.query);

  if (!result.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid filters.");
    return null;
  }

  return result.data;
}

function materialFilter(query) {
  const where = { status: "PUBLISHED" };

  if (query.category && query.category !== "All") {
    where.category = query.category;
  }

  if (query.type && query.type !== "All") {
    where.type = query.type;
  }

  if (query.level && query.level !== "All") {
    where.level = query.level;
  }

  if (query.search?.trim()) {
    where.OR = [
      {
        title: {
          contains: query.search.trim(),
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.search.trim(),
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

function materialOrder(sort) {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "title") return { title: "asc" };
  return { createdAt: "desc" };
}

async function listMaterials(req, res, next) {
  try {
    const query = getListQuery(req, res);
    if (!query) return;

    const where = materialFilter(query);

    const [materials, total] = await prisma.$transaction([
      prisma.studyMaterial.findMany({
        where,
        orderBy: materialOrder(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.studyMaterial.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        materials,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMaterial(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    const material = await prisma.studyMaterial.findFirst({
      where: { id, status: "PUBLISHED" },
    });

    if (!material) {
      return sendError(
        res, 404, "MATERIAL_NOT_FOUND", "Material not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    next(error);
  }
}

async function listBookmarks(req, res, next) {
  try {
    const bookmarks =
      await prisma.studyMaterialBookmark.findMany({
        where: {
          userId: req.user.id,
          material: { status: "PUBLISHED" },
        },
        include: { material: true },
        orderBy: { createdAt: "desc" },
      });

    return res.status(200).json({
      success: true,
      data: {
        materials: bookmarks.map((b) => b.material),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function addBookmark(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    const material = await prisma.studyMaterial.findFirst({
      where: { id, status: "PUBLISHED" },
      select: { id: true },
    });

    if (!material) {
      return sendError(
        res, 404, "MATERIAL_NOT_FOUND", "Material not found."
      );
    }

    await prisma.studyMaterialBookmark.upsert({
      where: {
        userId_materialId: {
          userId: req.user.id,
          materialId: id,
        },
      },
      create: {
        userId: req.user.id,
        materialId: id,
      },
      update: {},
    });

    return res.status(200).json({
      success: true,
      message: "Bookmark added successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function removeBookmark(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    await prisma.studyMaterialBookmark.deleteMany({
      where: {
        userId: req.user.id,
        materialId: id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Bookmark removed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function createMaterial(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendError(
        res, 400, "VALIDATION_ERROR", "Invalid material data."
      );
    }

    const material = await prisma.studyMaterial.create({
      data: parsed.data,
    });

    return res.status(201).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    next(error);
  }
}

async function updateMaterial(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    const parsed = createSchema.partial().safeParse(req.body);

    if (
      !parsed.success ||
      Object.keys(parsed.data).length === 0
    ) {
      return sendError(
        res, 400, "VALIDATION_ERROR", "Invalid update data."
      );
    }

    const existing = await prisma.studyMaterial.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return sendError(
        res, 404, "MATERIAL_NOT_FOUND", "Material not found."
      );
    }

    const material = await prisma.studyMaterial.update({
      where: { id },
      data: parsed.data,
    });

    return res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    next(error);
  }
}

async function publishMaterial(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    const existing = await prisma.studyMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      return sendError(
        res, 404, "MATERIAL_NOT_FOUND", "Material not found."
      );
    }

    if (!existing.content && !existing.resourceUrl) {
      return sendError(
        res,
        400,
        "CONTENT_REQUIRED",
        "Add content or a resource URL before publishing."
      );
    }

    const material = await prisma.studyMaterial.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: existing.publishedAt || new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    next(error);
  }
}

async function archiveMaterial(req, res, next) {
  try {
    const id = getMaterialId(req, res);
    if (!id) return;

    const existing = await prisma.studyMaterial.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return sendError(
        res, 404, "MATERIAL_NOT_FOUND", "Material not found."
      );
    }

    const material = await prisma.studyMaterial.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMaterials,
  getMaterial,
  listBookmarks,
  addBookmark,
  removeBookmark,
  createMaterial,
  updateMaterial,
  publishMaterial,
  archiveMaterial,
};
