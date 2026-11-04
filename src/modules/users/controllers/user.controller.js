const { updateProfileSchema } = require("../validation/user.validation");
const userService = require("../services/user.service");
const {
    listUsersSchema,
    updateUserStatusSchema,
    userIdParamSchema,
} = require("../validation/admin-user.validation");

async function getMyProfile(req, res, next) {
    try {
        const user = await userService.getMyProfile(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User account not found.",
                },
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    platformRole: user.platformRole,
                    emailVerified: Boolean(user.emailVerifiedAt),
                    createdAt: user.createdAt,
                    profile: user.profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

async function updateMyProfile(req, res, next) {
    try {
        const validation = updateProfileSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please check your profile details.",
                    details: validation.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
            });
        }

        const user = await userService.updateMyProfile(
            req.user.id,
            validation.data
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User account not found.",
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    platformRole: user.platformRole,
                    emailVerified: Boolean(user.emailVerifiedAt),
                    createdAt: user.createdAt,
                    profile: user.profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}


async function getMySecurity(req, res, next) {
    try {
        const security = await userService.getMySecurity(req.user.id);

        if (!security) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User account not found.",
                },
            });
        }

        return res.status(200).json({
            success: true,
            data: { security },
        });
    } catch (error) {
        next(error);
    }
}


async function listUsers(req, res, next) {
    try {
        const validation = listUsersSchema.safeParse(req.query);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please check the user-list filters.",
                    details: validation.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
            });
        }

        const result = await userService.listUsers(validation.data);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}


async function updateUserStatus(req, res, next) {
    try {
        const validation = updateUserStatusSchema.safeParse(req.body);
        const idValidation = userIdParamSchema.safeParse(req.params);




        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please provide a valid user ID.",
                },
            });
        }

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Provide a valid account status.",
                    details: validation.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
            });
        }

        const user = await userService.updateUserStatus({
            targetUserId: req.params.id,
            actorUserId: req.user.id,
            isActive: validation.data.isActive,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User account not found.",
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: "User account status updated successfully.",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}




module.exports = {
    getMyProfile,
    updateMyProfile,
    getMySecurity,
    listUsers,
    updateUserStatus
};
