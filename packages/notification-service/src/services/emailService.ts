import sgMail from "@sendgrid/mail";
import { logger } from "@e-commerce/shared";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  async sendOrderConfirmation(
    email: string,
    orderId: string,
    items: any[],
  ): Promise<void> {
    try {
      const itemsHtml = items
        .map(
          (item) =>
            `<tr>
              <td>${item.productId}</td>
              <td>${item.quantity}</td>
              <td>$${item.price.toFixed(2)}</td>
            </tr>`,
        )
        .join("");

      const html = `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <table>
          <tr>
            <th>Product ID</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
          ${itemsHtml}
        </table>
      `;

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@ecommerce.com",
        subject: `Order Confirmation - ${orderId}`,
        html,
      });

      logger.info("Order confirmation email sent", { email, orderId });
    } catch (error) {
      logger.error("Error sending email", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async sendPaymentConfirmation(
    email: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    try {
      const html = `
        <h2>Payment Confirmation</h2>
        <p>Your payment has been processed successfully.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
      `;

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@ecommerce.com",
        subject: `Payment Confirmation - ${orderId}`,
        html,
      });

      logger.info("Payment confirmation email sent", { email, orderId });
    } catch (error) {
      logger.error("Error sending email", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async sendShippingNotification(
    email: string,
    orderId: string,
    trackingNumber: string,
  ): Promise<void> {
    try {
      const html = `
        <h2>Order Shipped</h2>
        <p>Your order has been shipped!</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      `;

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@ecommerce.com",
        subject: `Order Shipped - ${orderId}`,
        html,
      });

      logger.info("Shipping notification email sent", { email, orderId });
    } catch (error) {
      logger.error("Error sending email", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default new EmailService();
