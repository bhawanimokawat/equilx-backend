const { OAuth2Client } = require("google-auth-library");
const { prisma } = require("../../../config/database");
const env = require("../../../config/env");

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const googleUserSelect = {
  id: true,
  email: true,
  platformRole: true,
  emailVerifiedAt: true,
  isActive: true,
  createdAt: true,
  profile: {
    select: {
      name: true,
      phone: true,
      avatarUrl: true,
    },
  },
  memberships: {
    where: {
      status: "ACTIVE",
    },
    select: {
      role: true,
      status: true,
    },
  },
};
/**
 * Verify Google ID token using Google's official verification library.
 */
async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw createError(
      "Google ID token is required.",
      400,
      "GOOGLE_TOKEN_REQUIRED"
    );
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw createError(
      "Google authentication failed. Please sign in again.",
      401,
      "INVALID_GOOGLE_TOKEN"
    );
  }

  const payload = ticket.getPayload();

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw createError(
      "Google account must have a verified email address.",
      401,
      "GOOGLE_EMAIL_NOT_VERIFIED"
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || null,
    picture: payload.picture || null,
  };
}

/**
 * Find an existing Google identity or create a new Equilx user.
 *
 * Existing email/password accounts are not automatically linked.
 * They must authenticate using their existing method before linking Google.
 */
async function findOrCreateGoogleUser(googleProfile) {
  const { googleId, email, name, picture } = googleProfile;

  // 1. Check whether this Google identity already exists.
  const existingIdentity = await prisma.authIdentity.findUnique({
    where: {
      provider_providerSubject: {
        provider: "GOOGLE",
        providerSubject: googleId,
      },
    },
    select: {
      user: {
        select: googleUserSelect,
      },
    },
  });

  if (existingIdentity) {
    const user = existingIdentity.user;

    if (!user.isActive) {
      throw createError(
        "Your account is inactive. Please contact support.",
        403,
        "ACCOUNT_INACTIVE"
      );
    }

    return {
      user,
      isNewUser: false,
    };
  }

  // 2. Prevent duplicate accounts and unsafe automatic linking.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw createError(
      "An account using this email already exists. Sign in using your existing method before linking Google.",
      409,
      "GOOGLE_ACCOUNT_LINK_REQUIRED"
    );
  }

  // 3. Create the Equilx account, profile and Google identity atomically.
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        emailVerifiedAt: new Date(),

        authIdentities: {
          create: {
            provider: "GOOGLE",
            providerSubject: googleId,
          },
        },

        profile: {
          create: {
            name,
            avatarUrl: picture,
          },
        },
      },
      select: googleUserSelect,
    });

    return {
      user,
      isNewUser: true,
    };
  } catch (error) {
    // Handle concurrent requests attempting to create the same identity.
    if (error.code === "P2002") {
      const identity = await prisma.authIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: "GOOGLE",
            providerSubject: googleId,
          },
        },
        select: {
          user: {
            select: googleUserSelect,
          },
        },
      });

      if (identity) {
        if (!identity.user.isActive) {
          throw createError(
            "Your account is inactive. Please contact support.",
            403,
            "ACCOUNT_INACTIVE"
          );
        }

        return {
          user: identity.user,
          isNewUser: false,
        };
      }

      throw createError(
        "An account using this email already exists. Sign in using your existing method before linking Google.",
        409,
        "GOOGLE_ACCOUNT_LINK_REQUIRED"
      );
    }

    throw error;
  }
}

/**
 * Main Google authentication service.
 */
async function authenticateWithGoogle(idToken) {
  const googleProfile = await verifyGoogleIdToken(idToken);

  return findOrCreateGoogleUser(googleProfile);
}

module.exports = {
  verifyGoogleIdToken,
  findOrCreateGoogleUser,
  authenticateWithGoogle,
};