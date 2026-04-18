/**
 * Notification service boundary — WhatsApp integration placeholder.
 *
 * All owner-facing notifications flow through this abstraction.
 * Currently logs to console. When a WhatsApp provider (e.g. Twilio,
 * Gupshup, or Meta Cloud API) is configured, replace the
 * `sendWhatsApp` implementation without changing call sites.
 */

export type NotificationType =
  | "block_request_new"
  | "block_request_approved"
  | "block_request_rejected"
  | "block_expiring_soon"
  | "confirmation_reminder"
  | "visit_scheduled"
  | "booking_completed"
  | "violation_logged";

export interface NotificationPayload {
  type: NotificationType;
  ownerId: string;
  ownerPhone?: string;
  roomNumber?: string;
  propertyName?: string;
  message: string;
  /** Optional structured data for template-based messages */
  templateData?: Record<string, string>;
}

/**
 * Send a notification to an owner.
 * Currently a no-op placeholder. Wire real WhatsApp provider here.
 */
export async function sendOwnerNotification(payload: NotificationPayload): Promise<void> {
  // TODO(WhatsApp): Replace with actual WhatsApp API call
  // Example providers: Twilio, Gupshup, Meta Cloud API
  console.log(`[NotificationService] ${payload.type} → owner:${payload.ownerId} | ${payload.message}`);
}

/**
 * Send bulk confirmation reminder to an owner.
 * Designed for 1-tap WhatsApp reply flow.
 */
export async function sendConfirmationReminder(
  ownerId: string,
  ownerPhone: string,
  propertyName: string,
  roomCount: number,
): Promise<void> {
  await sendOwnerNotification({
    type: "confirmation_reminder",
    ownerId,
    ownerPhone,
    propertyName,
    message: `Reminder: ${roomCount} rooms in ${propertyName} need today's status confirmation.`,
    templateData: {
      property: propertyName,
      count: String(roomCount),
    },
  });
}

/**
 * Notify owner about a new block request.
 */
export async function notifyBlockRequest(
  ownerId: string,
  ownerPhone: string,
  roomNumber: string,
  propertyName: string,
  expiryTime: string,
): Promise<void> {
  await sendOwnerNotification({
    type: "block_request_new",
    ownerId,
    ownerPhone,
    roomNumber,
    propertyName,
    message: `New block request on Room ${roomNumber} (${propertyName}). Expires: ${expiryTime}. Approve or reject now.`,
  });
}

/**
 * Notify owner about a scheduled visit.
 */
export async function notifyVisitScheduled(
  ownerId: string,
  ownerPhone: string,
  roomNumber: string,
  propertyName: string,
  scheduledTime: string,
  customerName: string,
): Promise<void> {
  await sendOwnerNotification({
    type: "visit_scheduled",
    ownerId,
    ownerPhone,
    roomNumber,
    propertyName,
    message: `Visit scheduled: ${customerName} for Room ${roomNumber} (${propertyName}) at ${scheduledTime}.`,
  });
}
