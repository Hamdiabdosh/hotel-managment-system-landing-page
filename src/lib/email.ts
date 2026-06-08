/** Email sending stub — wire to a provider when ready. */
export async function sendEmail(_params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; messageId?: string }> {
  console.info("[email stub] sendEmail called");
  return { ok: true, messageId: `stub-${Date.now()}` };
}
