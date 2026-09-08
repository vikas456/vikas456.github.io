/**
 * Contact form submission.
 *
 * With PUBLIC_WEB3FORMS_KEY set, posts to Web3Forms (free, no backend, handles
 * spam filtering and forwards to the inbox). Without it, the form composes a
 * mailto: so the button always does something real rather than silently
 * dropping a recruiter's message.
 */
/** Remembered across visits so a returning visitor is not shown a dead form. */
const QUOTA_KEY = 'vp.contact.quota-spent';
const QUOTA_RECHECK_MS = 24 * 60 * 60 * 1000;

function quotaSpentRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(QUOTA_KEY));
    return Boolean(at) && Date.now() - at < QUOTA_RECHECK_MS;
  } catch {
    return false;
  }
}

function rememberQuotaSpent(): void {
  try { localStorage.setItem(QUOTA_KEY, String(Date.now())); } catch { /* private mode */ }
}

/** Web3Forms answers over-quota with 429, or a message naming the limit. */
function isQuotaError(res: Response, body: { message?: string } | null): boolean {
  if (res.status === 429) return true;
  const m = (body?.message ?? '').toLowerCase();
  return m.includes('limit') || m.includes('quota') || m.includes('exceed');
}

export function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const status = document.getElementById('cf-status');
  const closed = document.getElementById('contact-closed');
  if (!form || !status) return;

  /** Swap the form for the email fallback. */
  const closeForm = (): void => {
    form.hidden = true;
    if (closed) closed.hidden = false;
  };

  // Already known to be over quota on a previous visit.
  if (!form.hidden && quotaSpentRecently()) closeForm();

  const setStatus = (text: string, tone: 'ok' | 'warn' | 'busy') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    // Honeypot tripped — pretend success so bots don't learn anything.
    if ((data.get('botcheck') as string)?.length) {
      setStatus('Thanks — your message is on its way.', 'ok');
      return;
    }

    const name = (data.get('name') as string ?? '').trim();
    const email = (data.get('email') as string ?? '').trim();
    const message = (data.get('message') as string ?? '').trim();

    if (!name || !email || !message) {
      setStatus('Please fill in every field so I can write back.', 'warn');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('That email address looks incomplete — mind checking it?', 'warn');
      return;
    }

    if (form.dataset.endpoint === 'mailto') {
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href =
        `mailto:vikas.peraka@gmail.com?subject=${encodeURIComponent(`Message from ${name}`)}&body=${body}`;
      setStatus('Opening your email app…', 'ok');
      document.dispatchEvent(new CustomEvent('contact:submit', { detail: { status: 'mailto' } }));
      return;
    }

    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (button) button.disabled = true;
    setStatus('Sending…', 'busy');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (isQuotaError(res, body)) {
          rememberQuotaSpent();
          closeForm();
          document.dispatchEvent(new CustomEvent('contact:submit', { detail: { status: 'quota' } }));
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      form.reset();
      setStatus("Thanks — I'll get back to you soon.", 'ok');
      document.dispatchEvent(new CustomEvent('contact:submit', { detail: { status: 'sent' } }));
    } catch {
      setStatus(
        'That did not go through. Email me directly at vikas.peraka@gmail.com and I will see it.',
        'warn',
      );
      document.dispatchEvent(new CustomEvent('contact:submit', { detail: { status: 'error' } }));
    } finally {
      if (button) button.disabled = false;
    }
  });
}
