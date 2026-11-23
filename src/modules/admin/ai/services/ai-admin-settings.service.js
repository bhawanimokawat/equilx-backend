
const { prisma } = require("../../../../config/database");
const aiConfig = require("../../../ai/config/ai.config");

// A fixed ID guarantees one settings record, even if multiple
// requests attempt to initialize settings simultaneously.
const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function validateNumber(value, field, min, max, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    fail(`${field} must be a ${integer ? "whole number" : "number"} between ${min} and ${max}.`);
  }
}

function createAIAdminSettingsService({ database = prisma } = {}) {
  

async function getOrCreateSettings() {
  try {
    return await database.aISettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        defaultProvider: aiConfig.provider,
        defaultModel: aiConfig.gemini.model,
        writingModel: aiConfig.gemini.model,
        speakingModel: aiConfig.gemini.speakingModel,
        transcriptionModel: aiConfig.gemini.transcriptionModel,
        temperature: aiConfig.generation.temperature,
        maxOutputTokens: aiConfig.generation.maxOutputTokens,
      },
      update: {},
    });
  } catch (error) {
    // Handle a concurrent request creating the singleton record.
    if (error.code === "P2002") {
      const settings = await database.aISettings.findUnique({
        where: { id: SETTINGS_ID },
      });

      if (settings) {
        return settings;
      }
    }

    throw error;
  }
}



  function presentSettings(settings) {
    return {
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      writingModel: settings.writingModel,
      speakingModel: settings.speakingModel,
      transcriptionModel: settings.transcriptionModel,
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      dailyBudget: Number(settings.dailyBudget),
      monthlyBudget: Number(settings.monthlyBudget),
      freeDailyLimit: settings.freeDailyLimit,
      proDailyLimit: settings.proDailyLimit,
      instituteDailyLimit: settings.instituteDailyLimit,
      alertsEnabled: settings.alertsEnabled,
      evaluationEnabled: settings.evaluationEnabled,
      loggingEnabled: settings.loggingEnabled,
      updatedAt: settings.updatedAt,
    };
  }

  async function getConfig() {
    const settings = await getOrCreateSettings();
    const {
      dailyBudget,
      monthlyBudget,
      freeDailyLimit,
      proDailyLimit,
      instituteDailyLimit,
      ...config
    } = presentSettings(settings);

    return config;
  }

  async function updateConfig(data) {
    const allowedFields = [
      "defaultProvider",
      "defaultModel",
      "writingModel",
      "speakingModel",
      "transcriptionModel",
      "temperature",
      "maxOutputTokens",
      "alertsEnabled",
      "evaluationEnabled",
      "loggingEnabled",
    ];

    const update = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        update[field] = data[field];
      }
    }

    if (!Object.keys(update).length) {
      fail("No valid AI configuration fields supplied.");
    }

    if (update.defaultProvider !== undefined) {
      if (update.defaultProvider !== "gemini") {
        fail("Only the Gemini provider is currently supported.");
      }
    }

    for (const field of [
      "defaultModel",
      "writingModel",
      "speakingModel",
      "transcriptionModel",
    ]) {
      if (
        update[field] !== undefined &&
        (typeof update[field] !== "string" || !update[field].trim())
      ) {
        fail(`${field} must be a non-empty string.`);
      }

      if (typeof update[field] === "string") {
        update[field] = update[field].trim();
      }
    }

    if (update.temperature !== undefined) {
      validateNumber(update.temperature, "Temperature", 0, 2);
    }

    if (update.maxOutputTokens !== undefined) {
      validateNumber(update.maxOutputTokens, "Maximum output tokens", 1, 32768, true);
    }

    for (const field of [
      "alertsEnabled",
      "evaluationEnabled",
      "loggingEnabled",
    ]) {
      if (update[field] !== undefined && typeof update[field] !== "boolean") {
        fail(`${field} must be a boolean.`);
      }
    }

    await getOrCreateSettings();

    const settings = await database.aISettings.update({
      where: { id: SETTINGS_ID },
      data: update,
    });

    return getConfigFromRecord(settings);
  }

  function getConfigFromRecord(settings) {
    const {
      dailyBudget,
      monthlyBudget,
      freeDailyLimit,
      proDailyLimit,
      instituteDailyLimit,
      ...config
    } = presentSettings(settings);

    return config;
  }

  async function getLimits() {
    const settings = await getOrCreateSettings();
    const values = presentSettings(settings);

    return {
      dailyBudget: values.dailyBudget,
      monthlyBudget: values.monthlyBudget,
      freeDailyLimit: values.freeDailyLimit,
      proDailyLimit: values.proDailyLimit,
      instituteDailyLimit: values.instituteDailyLimit,
      alertsEnabled: values.alertsEnabled,
    };
  }

  async function updateLimits(data) {
    const update = {};

    for (const field of ["dailyBudget", "monthlyBudget"]) {
      if (data[field] !== undefined) {
        const value = Number(data[field]);

        if (!Number.isFinite(value) || value < 0 || value > 9999999999.99) {
          fail(`${field} must be a non-negative valid budget.`);
        }

        update[field] = value.toFixed(2);
      }
    }

    for (const field of [
      "freeDailyLimit",
      "proDailyLimit",
      "instituteDailyLimit",
    ]) {
      if (data[field] !== undefined) {
        validateNumber(data[field], field, 0, 10000000, true);
        update[field] = data[field];
      }
    }

    if (data.alertsEnabled !== undefined) {
      if (typeof data.alertsEnabled !== "boolean") {
        fail("alertsEnabled must be a boolean.");
      }

      update.alertsEnabled = data.alertsEnabled;
    }

    if (!Object.keys(update).length) {
      fail("No valid AI limit fields supplied.");
    }

    await getOrCreateSettings();

    const settings = await database.aISettings.update({
      where: { id: SETTINGS_ID },
      data: update,
    });

    const values = presentSettings(settings);

    return {
      dailyBudget: values.dailyBudget,
      monthlyBudget: values.monthlyBudget,
      freeDailyLimit: values.freeDailyLimit,
      proDailyLimit: values.proDailyLimit,
      instituteDailyLimit: values.instituteDailyLimit,
      alertsEnabled: values.alertsEnabled,
    };
  }

  return {
    getConfig,
    updateConfig,
    getLimits,
    updateLimits,
  };
}

const service = createAIAdminSettingsService();

module.exports = {
  ...service,
  createAIAdminSettingsService,
};
