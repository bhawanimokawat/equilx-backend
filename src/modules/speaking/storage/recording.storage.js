
const fs = require("node:fs/promises");

const path = require("node:path");
const { createReadStream } = require("node:fs");
const { randomUUID } = require("node:crypto");

const STORAGE_ROOT = path.resolve(
  process.env.RECORDING_STORAGE_DIR ||
    path.join(process.cwd(), "private-storage", "speaking-recordings")
);

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = Object.freeze({
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
});

function createStorageError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeMimeType(mimeType) {
  if (typeof mimeType !== "string") {
    return "";
  }

  const normalized = mimeType.split(";")[0].trim().toLowerCase();

  if (normalized === "audio/x-wav") {
    return "audio/wav";
  }

  return normalized;
}

function getSafeFilePath(storageKey) {
  if (
    typeof storageKey !== "string" ||
    !/^speaking\/[a-f0-9-]{36}\.(webm|mp3|m4a|wav|ogg|aac|flac)$/i.test(
      storageKey
    )
  ) {
    throw createStorageError(
      "Invalid recording storage key.",
      "INVALID_STORAGE_KEY"
    );
  }

  const filePath = path.resolve(STORAGE_ROOT, storageKey);

  if (!filePath.startsWith(`${STORAGE_ROOT}${path.sep}`)) {
    throw createStorageError(
      "Invalid recording file path.",
      "INVALID_STORAGE_KEY"
    );
  }

  return filePath;
}

function getRecordingFilePath({ storageKey }) {
  return getSafeFilePath(storageKey);
}

async function saveRecording({ file }) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createStorageError(
      "A valid audio file is required.",
      "INVALID_AUDIO_FILE"
    );
  }

  if (file.buffer.length === 0) {
    throw createStorageError("Audio file cannot be empty.", "EMPTY_AUDIO_FILE");
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    throw createStorageError(
      "Audio file exceeds the 25 MB limit.",
      "FILE_TOO_LARGE"
    );
  }

  const mimeType = normalizeMimeType(file.mimetype);
  const extension = ALLOWED_AUDIO_TYPES[mimeType];

  if (!extension) {
    throw createStorageError(
      "Unsupported audio format.",
      "UNSUPPORTED_AUDIO_FORMAT"
    );
  }

  const storageKey = `speaking/${randomUUID()}.${extension}`;
  const filePath = getSafeFilePath(storageKey);

  await fs.mkdir(path.dirname(filePath), {
    recursive: true,
    mode: 0o700,
  });

  await fs.writeFile(filePath, file.buffer, {
    flag: "wx",
    mode: 0o600,
  });

  return {
    storageKey,
    mimeType,
    fileSizeBytes: file.buffer.length,
  };
}

async function deleteRecording({ storageKey }) {
  const filePath = getSafeFilePath(storageKey);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function createRecordingReadStream({ storageKey }) {
  const filePath = getSafeFilePath(storageKey);

  await fs.access(filePath);

  return createReadStream(filePath);
}

module.exports = {
  saveRecording,
  deleteRecording,
  createRecordingReadStream,
  getRecordingFilePath,
  normalizeMimeType,
  MAX_FILE_SIZE,
  ALLOWED_AUDIO_TYPES,
};
