type NotificationPayload = Record<string, unknown>;

type NotificationTemplate = {
  subject: string;
  text: string;
};

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function buildNotificationTemplate(eventType: string, payload: NotificationPayload): NotificationTemplate {
  switch (eventType) {
    case "winner.verification.submitted": {
      const winnerId = readString(payload.winnerId, "your winner record");
      return {
        subject: "Verification submitted",
        text: `Your winner verification was submitted for ${winnerId}. We will review your proof shortly.`,
      };
    }
    case "winner.verification.approved": {
      return {
        subject: "Verification approved",
        text: "Your winner verification has been approved. Your payout is now being prepared.",
      };
    }
    case "winner.verification.rejected": {
      return {
        subject: "Verification requires update",
        text: "Your winner verification was rejected. Please upload an updated proof document from your dashboard.",
      };
    }
    case "winner.payout.paid": {
      const paymentReference = readString(payload.paymentReference, "N/A");
      return {
        subject: "Payout sent",
        text: `Your winner payout has been marked as paid. Payment reference: ${paymentReference}.`,
      };
    }
    default: {
      return {
        subject: "Digital Heros update",
        text: "You have a new account notification. Please check your dashboard for details.",
      };
    }
  }
}
