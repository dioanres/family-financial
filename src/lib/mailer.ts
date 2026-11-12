import nodemailer, { type Transporter } from "nodemailer";

interface SendEmailParams {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

interface EmailTemplateParams {
  title: string;
  message: string;
  url?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailTemplate({ title, message, url }: EmailTemplateParams) {
  const text = url ? `${message}\n\nBuka aplikasi: ${url}` : message;

  const button = url
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Buka Aplikasi</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,sans-serif;color:#1c1917">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
      <p style="margin:0 0 4px;font-size:13px;color:#78716c">🏡 Catatan Keluarga</p>
      <h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.5">${escapeHtml(message)}</p>
      ${button}
    </div>
  </body>
</html>`;

  return { subject: title, text, html };
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  const smtp = getTransporter();
  if (!smtp) {
    console.warn("SMTP env vars not set, skipping email notification");
    return;
  }

  const errors: unknown[] = [];
  for (const address of to) {
    try {
      await smtp.sendMail({ from: process.env.SMTP_FROM, to: address, subject, text, html });
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(`${errors.length}/${to.length} email gagal dikirim: ${String(errors[0])}`);
  }
}
