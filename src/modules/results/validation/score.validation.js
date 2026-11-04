
const { z } = require("zod");

const conversionRowSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  band: z.number().min(0).max(9),
});

const conversionTableSchema = z
  .object({
    type: z.literal("IELTS_RAW_TO_BAND"),
    section: z.enum(["LISTENING", "READING"]),
    totalQuestions: z.number().int().positive(),
    rawScoreToBand: z.array(conversionRowSchema).min(1),
  })
  .superRefine((table, ctx) => {
    const rows = [...table.rawScoreToBand].sort(
      (a, b) => a.min - b.min
    );

    if (rows[0].min !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Conversion ranges must start at zero.",
        path: ["rawScoreToBand"],
      });
    }

    rows.forEach((row, index) => {
      if (row.min > row.max) {
        ctx.addIssue({
          code: "custom",
          message: "Minimum score cannot exceed maximum score.",
          path: ["rawScoreToBand", index],
        });
      }

      if (row.max > table.totalQuestions) {
        ctx.addIssue({
          code: "custom",
          message: "Conversion range exceeds total questions.",
          path: ["rawScoreToBand", index],
        });
      }

      if (index > 0) {
        const previousRow = rows[index - 1];

        if (row.min <= previousRow.max) {
          ctx.addIssue({
            code: "custom",
            message: "Conversion ranges must not overlap.",
            path: ["rawScoreToBand", index],
          });
        }

        if (row.min !== previousRow.max + 1) {
          ctx.addIssue({
            code: "custom",
            message: "Conversion ranges must not contain gaps.",
            path: ["rawScoreToBand", index],
          });
        }
      }
    });

    const lastRow = rows[rows.length - 1];

    if (lastRow.max !== table.totalQuestions) {
      ctx.addIssue({
        code: "custom",
        message: "Conversion ranges must cover the total question count.",
        path: ["rawScoreToBand"],
      });
    }
  });

module.exports = {
  conversionTableSchema,
};
