import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

// In development, we use Ethereal Email (ethereal.email) which is a fake SMTP service
// that allows us to test email sending without actually delivering emails.
// In production, this should be replaced with a real email service provider.
let testAccount: nodemailer.TestAccount | null = null;

export async function getTransporter() {
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
  }

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendVerificationEmail(email: string, token: string, organizationName: string) {
  const transporter = await getTransporter();

  const verificationLink = `${process.env.APP_URL || 'http://localhost:5000'}/api/organizations/verify/${token}`;

  const info = await transporter.sendMail({
    from: '"PoetPortal" <noreply@poetportal.com>',
    to: email,
    subject: "Verify your organization on PoetPortal",
    text: `Hello,\n\nPlease verify your organization "${organizationName}" by clicking on the following link:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nBest regards,\nPoetPortal Team`,
    html: `
      <h2>Welcome to PoetPortal!</h2>
      <p>Please verify your organization "${organizationName}" by clicking on the button below:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Verify Organization</a>
      <p>Or copy and paste this link in your browser:</p>
      <p>${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>PoetPortal Team</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("\n=== Test Email Details ===");
  console.log("This is a development environment using Ethereal Email.");
  console.log("No real email will be sent. Instead, view the email here:");
  console.log(previewUrl);
  console.log("============================\n");

  return previewUrl;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}