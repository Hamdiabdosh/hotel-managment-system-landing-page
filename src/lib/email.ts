import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  role: string;
  tempPassword: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email to", opts.to);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "You've been invited to the Hotel Management System",
    text: [
      `Hi ${opts.name},`,
      `You have been added as ${opts.role}.`,
      `Your temporary password is: ${opts.tempPassword}`,
      `Please sign in and change your password immediately.`,
    ].join("\n\n"),
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reset email to", opts.to);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your password has been reset",
    text: [
      `Hi ${opts.name},`,
      `Your temporary password is: ${opts.tempPassword}`,
      `Please sign in and change it immediately.`,
    ].join("\n\n"),
  });
}

export async function sendReservationConfirmation(opts: {
  to: string;
  guestName: string;
  hotelName: string;
  code: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  currency: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation to", opts.to);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Booking confirmed — ${opts.code} at ${opts.hotelName}`,
    text: [
      `Dear ${opts.guestName},`,
      `Your reservation is confirmed.`,
      `Booking: ${opts.code}`,
      `Room: ${opts.roomNumber} (${opts.roomType})`,
      `Check-in: ${opts.checkIn}`,
      `Check-out: ${opts.checkOut}`,
      `Nights: ${opts.nights}`,
      `Total: ${opts.totalAmount} ${opts.currency}`,
      `We look forward to welcoming you.`,
    ].join("\n\n"),
  });
}
