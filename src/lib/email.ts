export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  role: string;
  tempPassword: string;
}): Promise<void> {
  console.warn("[email] sendInviteEmail stub — integrate SMTP/Resend to enable:", opts.to);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<void> {
  console.warn("[email] sendPasswordResetEmail stub — integrate SMTP/Resend to enable:", opts.to);
}
