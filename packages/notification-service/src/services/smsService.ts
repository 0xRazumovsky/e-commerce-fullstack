import twilio from "twilio";
import { logger } from "@e-commerce/shared";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export class SmsService {
  async sendOrderNotification(
    phoneNumber: string,
    orderId: string,
  ): Promise<void> {
    try {
      await client.messages.create({
        body: `Your order ${orderId} has been confirmed. You will receive updates soon.`,
        from: process.env.TWILIO_PHONE,
        to: phoneNumber,
      });

      logger.info("SMS sent", { phoneNumber, orderId });
    } catch (error) {
      logger.error("Error sending SMS", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async sendPaymentNotification(
    phoneNumber: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    try {
      await client.messages.create({
        body: `Payment of $${amount.toFixed(2)} for order ${orderId} has been processed successfully.`,
        from: process.env.TWILIO_PHONE,
        to: phoneNumber,
      });

      logger.info("SMS sent", { phoneNumber, orderId });
    } catch (error) {
      logger.error("Error sending SMS", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default new SmsService();
