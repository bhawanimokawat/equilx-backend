const crypto = require("node:crypto");
const { prisma } = require("../../../config/database");
const {
    OTP_TTL_MS,
    generateOtp,
    hashOtp,
    sendVerificationOtp,
} = require("./otp.service");

async function registerUser({ name, email, passwordHash, }) {
    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        const error = new Error("An account with this email already exists");
        error.statusCode = 409;
        error.code = "EMAIL_ALREADY_REGISTERED";
        throw error;
    }

    const otp = generateOtp();
    const tokenHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: {
                email,
                passwordHash,
                profile: name
                    ? { create: { name } }
                    : undefined,
            },
            select: { id: true, email: true, createdAt: true },
        });

        await tx.emailVerificationToken.create({
            data: {
                userId: createdUser.id,
                tokenHash,
                expiresAt,
            },
        });

        return createdUser;
    });

    try {
        await sendVerificationOtp(user.email, otp);
    } catch (error) {
        // Remove the pending account if the verification email cannot be sent.
        await prisma.user.delete({ where: { id: user.id } }).catch(() => { });
        throw error;
    }

    return user;
}

module.exports = { registerUser };
