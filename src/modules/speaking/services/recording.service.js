
const { prisma } = require("../../../config/database");
const {
  saveRecording,
  deleteRecording,
} = require("../storage/recording.storage");
const { createHash } = require("node:crypto");

function createServiceError(
  message,
  statusCode = 400,
  code = "RECORDING_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function addCalendarMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDay));

  return result;
}

function validateAudioSignature(file) {
  const buffer = file.buffer;
  const mimeType = file.mimetype;

  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw createServiceError(
      "The uploaded audio file is invalid.",
      400,
      "INVALID_AUDIO_FILE"
    );
  }

  const isWebM =
    mimeType === "audio/webm" &&
    buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  const isMp3 =
    mimeType === "audio/mpeg" &&
    (
      buffer.subarray(0, 3).toString() === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );

  const isMp4 =
    mimeType === "audio/mp4" &&
    buffer.subarray(4, 8).toString() === "ftyp";

  const isWav =
    ["audio/wav", "audio/x-wav"].includes(mimeType) &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WAVE";

  const isOgg =
    mimeType === "audio/ogg" &&
    buffer.subarray(0, 4).toString() === "OggS";

  const isAac =
    mimeType === "audio/aac" &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xf6) === 0xf0;

  const isFlac =
    mimeType === "audio/flac" &&
    buffer.subarray(0, 4).toString() === "fLaC";

  if (
    !isWebM &&
    !isMp3 &&
    !isMp4 &&
    !isWav &&
    !isOgg &&
    !isAac &&
    !isFlac
  ) {
    throw createServiceError(
      "Audio content does not match its declared file format.",
      400,
      "INVALID_AUDIO_SIGNATURE"
    );
  }
}


async function uploadSpeakingRecording({
  userId,
  submissionId,
  file,
  durationSeconds,
}) {
  if (!userId || !submissionId) {
    throw createServiceError(
      "User ID and submission ID are required.",
      400,
      "INVALID_REQUEST"
    );
  }

  if (
    durationSeconds !== undefined &&
    (!Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 900)
  ) {
    throw createServiceError(
      "Recording duration must be between 1 and 900 seconds.",
      400,
      "INVALID_RECORDING_DURATION"
    );
  }

  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createServiceError(
      "A valid audio file is required.",
      400,
      "INVALID_AUDIO_FILE"
    );
  }

  validateAudioSignature(file);

  // Generate a SHA-256 checksum for exact file comparison.
  const checksum = createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  const submission = await prisma.speakingSubmission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
    select: {
      id: true,
      consentStatus: true,
      attempt: {
        select: {
          status: true,
          deadlineAt: true,
        },
      },
    },
  });

  if (!submission) {
    throw createServiceError(
      "Speaking submission not found.",
      404,
      "SPEAKING_SUBMISSION_NOT_FOUND"
    );
  }

  if (submission.consentStatus !== "GRANTED") {
    throw createServiceError(
      "Recording consent is required.",
      403,
      "RECORDING_CONSENT_REQUIRED"
    );
  }

  if (submission.attempt.status !== "IN_PROGRESS") {
    throw createServiceError(
      "This Speaking attempt is no longer accepting recordings.",
      409,
      "ATTEMPT_NOT_ACTIVE"
    );
  }

  if (
    submission.attempt.deadlineAt &&
    new Date() > submission.attempt.deadlineAt
  ) {
    throw createServiceError(
      "The Speaking attempt deadline has passed.",
      409,
      "ATTEMPT_DEADLINE_PASSED"
    );
  }

  const recordingSelect = {
    id: true,
    submissionId: true,
    mimeType: true,
    durationSeconds: true,
    fileSizeBytes: true,
    consentStatus: true,
    recordedAt: true,
    deleteAfter: true,
    createdAt: true,
  };

  // Check whether this exact recording was already uploaded.
  const existingRecording = await prisma.speakingRecording.findFirst({
    where: {
      submissionId,
      deletedAt: null,
    },
    select: {
      ...recordingSelect,
      checksum: true,
    },
  });

  if (existingRecording) {
    if (existingRecording.checksum === checksum) {
      const { checksum: ignoredChecksum, ...recording } =
        existingRecording;

      return {
        recording,
        alreadyExists: true,
      };
    }

    throw createServiceError(
      "A different active recording already exists for this Speaking submission.",
      409,
      "RECORDING_ALREADY_EXISTS"
    );
  }

  // Save the file only after checking for an existing recording.
  const storedFile = await saveRecording({ file });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Recheck inside the transaction to handle concurrent uploads.
        const activeRecording = await tx.speakingRecording.findFirst({
          where: {
            submissionId,
            deletedAt: null,
          },
          select: {
            ...recordingSelect,
            checksum: true,
          },
        });

        if (activeRecording) {
          if (activeRecording.checksum === checksum) {
            const { checksum: ignoredChecksum, ...recording } =
              activeRecording;

            return {
              recording,
              alreadyExists: true,
            };
          }

          throw createServiceError(
            "A different active recording already exists for this Speaking submission.",
            409,
            "RECORDING_ALREADY_EXISTS"
          );
        }

        const recordedAt = new Date();
        const deleteAfter = addCalendarMonths(recordedAt, 3);

        const recording = await tx.speakingRecording.create({
          data: {
            submissionId,
            storageKey: storedFile.storageKey,
            mimeType: storedFile.mimeType,
            durationSeconds: durationSeconds ?? null,
            fileSizeBytes: BigInt(storedFile.fileSizeBytes),
            checksum,
            consentStatus: "GRANTED",
            recordedAt,
            deleteAfter,
          },
          select: recordingSelect,
        });

        return {
          recording,
          alreadyExists: false,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    // The transaction found an identical recording.
    // Remove the newly saved duplicate file.
    if (result.alreadyExists) {
      await deleteRecording({
        storageKey: storedFile.storageKey,
      });
    }

    return result;
  } catch (error) {
    // Clean up the file created by this upload.
    try {
      await deleteRecording({
        storageKey: storedFile.storageKey,
      });
    } catch (cleanupError) {
      console.error(
        "[SPEAKING RECORDING CLEANUP ERROR]",
        cleanupError.message
      );
    }

    // Serializable transactions can conflict during concurrent uploads.
    // Check whether another request successfully created the same recording.
    if (error.code === "P2034") {
      const concurrentRecording =
        await prisma.speakingRecording.findFirst({
          where: {
            submissionId,
            deletedAt: null,
          },
          select: {
            ...recordingSelect,
            checksum: true,
          },
        });

      if (concurrentRecording) {
        if (concurrentRecording.checksum === checksum) {
          const { checksum: ignoredChecksum, ...recording } =
            concurrentRecording;

          return {
            recording,
            alreadyExists: true,
          };
        }

        throw createServiceError(
          "A different active recording already exists for this Speaking submission.",
          409,
          "RECORDING_ALREADY_EXISTS"
        );
      }

      throw createServiceError(
        "Recording upload conflicted with another request. Please retry.",
        409,
        "RECORDING_UPLOAD_CONFLICT"
      );
    }

    throw error;
  }
}

async function withdrawRecordingConsent({
  userId,
  submissionId,
}) {
  if (!userId || !submissionId) {
    throw createServiceError("User ID and submission ID are required.");
  }

  const submission = await prisma.speakingSubmission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
    select: {
      id: true,
      consentStatus: true,
    },
  });

  if (!submission) {
    throw createServiceError(
      "Speaking submission was not found.",
      404,
      "SPEAKING_SUBMISSION_NOT_FOUND"
    );
  }

  if (submission.consentStatus === "WITHDRAWN") {
    return {
      submissionId,
      consentStatus: "WITHDRAWN",
      message: "Recording consent has already been withdrawn.",
    };
  }

  const recordings = await prisma.speakingRecording.findMany({
    where: {
      submissionId,
      deletedAt: null,
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.speakingSubmission.update({
      where: { id: submissionId },
      data: {
        consentStatus: "WITHDRAWN",
      },
    });

    await tx.speakingRecording.updateMany({
      where: {
        submissionId,
        deletedAt: null,
      },
      data: {
        consentStatus: "WITHDRAWN",
      },
    });
  });

  let deletedCount = 0;

  for (const recording of recordings) {
    try {
      await deleteRecording({
        storageKey: recording.storageKey,
      });

      await prisma.speakingRecording.update({
        where: { id: recording.id },
        data: { deletedAt: new Date() },
      });

      deletedCount += 1;
    } catch (error) {
      console.error(
        "[SPEAKING RECORDING DELETION ERROR]",
        recording.id,
        error.message
      );
    }
  }

  return {
    submissionId,
    consentStatus: "WITHDRAWN",
    deletedRecordings: deletedCount,
    message: "Recording consent has been withdrawn.",
  };
}

module.exports = {
  uploadSpeakingRecording,
  withdrawRecordingConsent,
};
