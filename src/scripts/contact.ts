/**
 * Contact form submission.
 *
 * With PUBLIC_WEB3FORMS_KEY set, posts to Web3Forms (free, no backend, handles
 * spam filtering and forwards to the inbox). Without it, the form composes a
 * mailto: so the button always does something real rather than silently
 * dropping a recruiter's message.
 */
export function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const status = document.getElementById('cf-status');
  if (!form || !status) return;

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
