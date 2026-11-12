// Transactional email through Resend. Without RESEND_API_KEY or a real
// MAIL_FROM (local dev) the email is logged instead of sent.

// `site` is the origin the visitor signed up on, e.g. https://example.com.
export async function sendWelcome(env, site, email, unsubToken) {
  const unsubPage = `${site}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const oneClick = `${site}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

  const text = [
    'Thanks for signing up!',
    '',
    "You'll get an email when a new Kramps game comes out, plus the occasional update on games still in development.",
    '',
    `Play the games: ${site}/`,
    '',
    '— Kramps',
    '',
    `Don't want these emails? Unsubscribe: ${unsubPage}`,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1b1b1b">
<p>Thanks for signing up!</p>
<p>You'll get an email when a new Kramps game comes out, plus the occasional update on games still in development.</p>
<p><a href="${site}/">Play the games</a></p>
<p>— Kramps</p>
<p style="margin-top:32px;font-size:12px;color:#616161">Don't want these emails? <a href="${unsubPage}" style="color:#616161">Unsubscribe</a>.</p>
</body></html>`;

  const message = {
    from: env.MAIL_FROM,
    to: [email],
    subject: "You're on the Kramps Games list",
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };

  if (!env.RESEND_API_KEY || !env.MAIL_FROM || env.MAIL_FROM.includes('example.com')) {
    console.log('RESEND_API_KEY or MAIL_FROM not set; welcome email not sent', { to: email, unsubPage });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) console.error('welcome email failed', res.status, await res.text());
  } catch (err) {
    console.error('welcome email failed', err);
  }
}
