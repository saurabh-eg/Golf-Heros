import { describe, expect, it } from "vitest";
import { buildNotificationTemplate } from "./templates";

describe("notification templates", () => {
  it("builds payout paid email content", () => {
    const template = buildNotificationTemplate("winner.payout.paid", { paymentReference: "abc-123" });

    expect(template.subject).toBe("Payout sent");
    expect(template.text).toContain("abc-123");
  });

  it("falls back to generic template for unknown events", () => {
    const template = buildNotificationTemplate("unknown.event", {});

    expect(template.subject).toBe("Digital Heros update");
  });
});
