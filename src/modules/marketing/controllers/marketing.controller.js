const marketingService = require("../services/marketing-email.service");

async function updateMarketingPreferences(req, res, next) {
  try {
    const { marketingEmailEnabled } = req.body;

    if (typeof marketingEmailEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "marketingEmailEnabled must be true or false.",
        },
      });
    }

    const preference = await marketingService.updateMarketingConsent(
      req.user.id,
      marketingEmailEnabled
    );

    return res.status(200).json({
      success: true,
      message: marketingEmailEnabled
        ? "Marketing email consent saved."
        : "Promotional emails disabled.",
      data: { preference },
    });
  } catch (error) {
    next(error);
  }
}

async function unsubscribe(req, res) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid unsubscribe link.");
    }

    await marketingService.unsubscribeFromMarketing(token);

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribed - Equilx</title></head>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:50px">
          <h2>You have been unsubscribed.</h2>
          <p>You will no longer receive Equilx promotional emails.</p>
        </body>
      </html>
    `);
  } catch (error) {
    return res.status(error.statusCode || 400).send(
      "This unsubscribe link is invalid or has expired."
    );
  }
}

module.exports = {
  updateMarketingPreferences,
  unsubscribe,
};