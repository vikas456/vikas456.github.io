const GREETING =
  "Hi — I'm a custom-built chatbot for this site. Ask me anything about Vikas's " +
  'work, background or projects.';

const OPEN_KEY = 'vp.chat.open';
const MAX_TURNS = 12;

interface Turn { role: 'user' | 'assistant'; content: string }

export function initChat(): void {
  const root = document.getElementById('chat');
  const panel = document.getElementById('chat-panel');
  const openBtn = document.getElementById('chat-open') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('chat-close');
  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form') as HTMLFormElement | null;
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const send = document.getElementById('chat-send') as HTMLButtonElement | null;
  if (!root || !panel || !openBtn || !closeBtn || !log || !form || !input || !send) return;

  const endpoint = root.dataset.endpoint ?? '';
  const history: Turn[] = [];
  let busy = false;

  /* ---------- rendering ---------- */

  const scroll = () => { log.scrollTop = log.scrollHeight; };

  function bubble(role: 'bot' | 'me', text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    log.appendChild(el);
    scroll();
    return el;
  }

  function typing(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.setAttribute('aria-label', 'Thinking');
    el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el);
    scroll();
    return el;
  }

  /* ---------- open / close ---------- */

  function setOpen(open: boolean, focus = true): void {
    panel!.hidden = !open;
    openBtn!.hidden = open;
    openBtn!.setAttribute('aria-expanded', open ? 'true' : 'false');
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* private mode */ }
    if (open) {
      if (!log!.childElementCount) bubble('bot', GREETING);
      if (focus && window.matchMedia('(min-width: 700px)').matches) input!.focus();
    } else if (focus) {
      openBtn!.focus();
    }
  }

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  /* ---------- sending ---------- */

  async function ask(question: string): Promise<void> {
    busy = true;
    send!.disabled = true;
    input!.value = '';
    bubble('me', question);
    history.push({ role: 'user', content: question });

    const dots = typing();

    if (!endpoint) {
      dots.remove();
      bubble('bot', "I'm not connected yet — the backend is still being set up. In the meantime, email vikas.peraka@gmail.com.");
      busy = false;
      send!.disabled = false;
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_TURNS) }),
      });

      if (!res.ok || !res.body) {
        let msg = 'Something went wrong reaching the assistant. Email vikas.peraka@gmail.com and it will get through.';
        try {
          const j = await res.json();
          if (typeof j?.error === 'string') msg = j.error;
        } catch { /* keep the default */ }
        dots.remove();
        bubble('bot', msg);
        return;
      }

      // Stream the answer in as it arrives.
      dots.remove();
      const el = bubble('bot', '');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        el.textContent = answer;
        scroll();
      }
      if (!answer.trim()) {
        el.textContent = "I didn't catch that — try asking another way, or email vikas.peraka@gmail.com.";
      } else {
        history.push({ role: 'assistant', content: answer });
      }
    } catch {
      dots.remove();
      bubble('bot', 'That request did not go through. Email vikas.peraka@gmail.com and it will reach him.');
    } finally {
      busy = false;
      send!.disabled = false;
      if (window.matchMedia('(min-width: 700px)').matches) input!.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || busy) return;
    void ask(q);
  });

  /* ---------- first paint ---------- */

  // Open by default on a first desktop visit; never auto-open on a phone, where
  // it would cover the page before anything has been read.
  let remembered: string | null = null;
  try { remembered = localStorage.getItem(OPEN_KEY); } catch { /* private mode */ }
  const wide = window.matchMedia('(min-width: 700px)').matches;
  setOpen(remembered === null ? wide : remembered === '1', false);
}
