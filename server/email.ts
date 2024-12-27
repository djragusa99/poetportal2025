import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

// For testing, we'll use Ethereal Email
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

  console.log("Verification email sent. Preview URL: %s", nodemailer.getTestMessageUrl(info));
  return nodemailer.getTestMessageUrl(info);
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}
