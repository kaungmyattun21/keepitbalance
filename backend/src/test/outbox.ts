type Email = { to: string; subject: string; text: string };

export const outbox: Email[] = [];

export function lastLinkSentTo(email: string): URL {
  const message = outbox.findLast((sent) => sent.to === email);
  const link = message?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error(`No email with a link was sent to ${email}`);
  return new URL(link);
}
