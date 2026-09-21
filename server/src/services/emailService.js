import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

function baseTemplate(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
              👗 Cloth Market
            </h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">FashionTech Commerce</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              © ${new Date().getFullYear()} Cloth Market. All rights reserved.<br/>
              You received this email because you have an account with us.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to, name, verificationLink) {
  if (!resend) {
    console.log(`[EMAIL STUB] Verification email → ${to} | Link: ${verificationLink}`);
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Hi ${name} 👋</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Welcome to Cloth Market! Please verify your email address to activate your account and start shopping.
    </p>
    <a href="${verificationLink}"
      style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:600;font-size:15px;">
      Verify My Email
    </a>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>`;

  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: "Verify your Cloth Market account",
    html: baseTemplate("Verify your email", body)
  });
}

export async function sendPasswordResetEmail(to, name, resetLink) {
  if (!resend) {
    console.log(`[EMAIL STUB] Password reset email → ${to} | Link: ${resetLink}`);
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Reset your password</h2>
    <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      We received a request to reset your Cloth Market password. Click the button below to set a new password.
    </p>
    <a href="${resetLink}"
      style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:600;font-size:15px;">
      Reset Password
    </a>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>`;

  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: "Reset your Cloth Market password",
    html: baseTemplate("Reset your password", body)
  });
}

export async function sendOrderConfirmationEmail(to, name, order) {
  if (!resend) {
    console.log(`[EMAIL STUB] Order confirmation → ${to} | Order: ${order.id}`);
    return;
  }

  const itemRows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;">${item.name}</td>
        <td style="padding:10px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;text-align:right;">₹${item.price}</td>
      </tr>`
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Order Confirmed! 🎉</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Hi ${name}, your order <strong>#${order.id}</strong> has been placed successfully.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:12px 16px;text-align:left;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Item</th>
          <th style="padding:12px 16px;text-align:center;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Qty</th>
          <th style="padding:12px 16px;text-align:right;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody style="padding:0 16px;">
        ${itemRows}
      </tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#64748b;font-size:14px;padding:4px 0;">Subtotal</td><td style="text-align:right;color:#334155;font-size:14px;">₹${order.subtotal}</td></tr>
      <tr><td style="color:#64748b;font-size:14px;padding:4px 0;">Tax (8%)</td><td style="text-align:right;color:#334155;font-size:14px;">₹${order.tax}</td></tr>
      <tr><td style="color:#64748b;font-size:14px;padding:4px 0;">Delivery</td><td style="text-align:right;color:#334155;font-size:14px;">₹${order.deliveryFee}</td></tr>
      ${order.discount ? `<tr><td style="color:#22c55e;font-size:14px;padding:4px 0;">Discount</td><td style="text-align:right;color:#22c55e;font-size:14px;">-₹${order.discount}</td></tr>` : ""}
      <tr><td style="color:#0f172a;font-size:16px;font-weight:700;padding:12px 0 0;border-top:2px solid #e2e8f0;">Total</td><td style="text-align:right;color:#0f172a;font-size:16px;font-weight:700;padding:12px 0 0;border-top:2px solid #e2e8f0;">₹${order.total}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">
      Payment method: <strong>${order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}</strong>. 
      We'll notify you when your order ships.
    </p>`;

  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: `Order Confirmed — #${order.id} | Cloth Market`,
    html: baseTemplate("Order Confirmed", body)
  });
}
