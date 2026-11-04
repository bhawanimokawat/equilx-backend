
const { z } = require("zod");
const { prisma } = require("../../../config/database");

const instituteIdSchema = z.string().uuid();

async function requireCrmAccess(req, res, next) {
    const result = instituteIdSchema.safeParse(req.params.instituteId);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            error: {
                code: "INVALID_INSTITUTE_ID",
                message: "A valid institute ID is required.",
            },
        });
    }

    if (!req.user?.id) {
        return res.status(401).json({
            success: false,
            error: {
                code: "AUTHENTICATION_REQUIRED",
                message: "Please log in to continue.",
            },
        });
    }

    const instituteId = result.data;

    try {
        if (req.user.platformRole === "SUPER_ADMIN") {
            req.crmScope = {
                instituteId,
                role: "SUPER_ADMIN",
                userId: req.user.id,
            };

            return next();
        }
        const membership = await prisma.instituteMembership.findFirst({
            where: {
                instituteId,
                userId: req.user.id,
                status: "ACTIVE",
                institute: {
                    status: "ACTIVE",
                },
                role: {
                    in: ["INSTITUTE_ADMIN", "TRAINER"],
                },
            },
            select: {
                id: true,
                instituteId: true,
                role: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "CRM_ACCESS_DENIED",
                    message: "You do not have CRM access to this institute.",
                },
            });
        }

        req.crmScope = {
            instituteId: membership.instituteId,
            membershipId: membership.id,
            role: membership.role,
            userId: req.user.id,
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    requireCrmAccess,
};
