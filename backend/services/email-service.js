import nodemailer from "nodemailer";
import { getConfig } from "../config/env.js";
import { logger } from "../lib/logger.js";

let transporter;
function getTransporter() {
  const smtp = getConfig().integrations.smtp;
  if (!smtp.host || !smtp.user || !smtp.password) return null;
  if (!transporter) transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.password }, disableFileAccess: true, disableUrlAccess: true });
  return transporter;
}

export async function sendTransactionalEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) { logger.warn("email_delivery_skipped", { to, subject, reason: "smtp_not_configured" }); return { delivered: false, reason: "smtp_not_configured" }; }
  const smtp = getConfig().integrations.smtp;
  const result = await transport.sendMail({ from: `"${smtp.fromName}" <${smtp.fromEmail || smtp.user}>`, to, subject, text, html });
  return { delivered: true, messageId: result.messageId };
}
