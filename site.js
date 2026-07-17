/* ============================================================
   RODGERS PLUMBING & DRAINAGE — site.js
   ============================================================ */

// ── NAV: scroll blur + mobile hamburger ──────────────────────
const nav       = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

// Bound here rather than via inline onclick — the CSP script-src has no
// 'unsafe-inline', so inline handlers in the HTML would be silently blocked.
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMobileMenu);
});

// ── STAT COUNTER ANIMATION ───────────────────────────────────
function animateStat(el) {
  const target   = parseInt(el.dataset.target, 10);
  const suffix   = el.dataset.suffix || '';
  const duration = 2000;
  const start    = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const statsObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    document.querySelectorAll('.stat-number').forEach(animateStat);
    statsObs.disconnect();
  }
}, { threshold: 0.3 });
statsObs.observe(document.getElementById('stats-row'));

// ── SERVICE CAROUSEL (3D perspective) ───────────────────────
const SERVICES = [
  {
    title: 'Residential Maintenance',
    desc:  'Leaking taps, hot water systems, pipe repairs — done with zero fuss and a clean finish.',
    img:   'https://framerusercontent.com/images/QSZkEWbXmi8tJUzV0epSgXKyU.jpeg',
  },
  {
    title: 'Blocked Drains & CCTV Inspection',
    desc:  'Stubborn blockages cleared fast. CCTV inspection — no guesswork, no unnecessary digging.',
    img:   'https://framerusercontent.com/images/konUxIRXT8WJZGS6U0g147Wh4c.jpeg',
  },
  {
    title: 'Hot Water Systems',
    desc:  'Supply, installation, and repair of gas, electric, and heat pump systems. Same-day install.',
    img:   'https://framerusercontent.com/images/fYpxodx3aozbcJNZvYvJQjsuPg.jpeg',
  },
  {
    title: 'Gasfitting',
    desc:  'Licensed gasfitting for BBQs, cooktops, heaters, and new connections. NSW compliant.',
    img:   'https://framerusercontent.com/images/HaXRBBty6weYGZaD3lXCTEIZmA.jpeg',
  },
  {
    title: 'New Builds & Renovations',
    desc:  'Full rough-in and fit-off for new builds. We work alongside your builder from slab to handover.',
    img:   'https://framerusercontent.com/images/WohBy2GMhYlXhdSjal00FFjA58.jpeg',
  },
  {
    title: 'Emergency Plumbing',
    desc:  'Burst pipes, overflowing drains, gas leaks — available 24/7 across the Northern Beaches.',
    img:   'https://framerusercontent.com/images/PTrlPi6PGZSQ1KfnO0BmGiNrgnM.jpeg',
  },
];

const stage  = document.getElementById('carousel-stage');
const dotsEl = document.getElementById('carousel-dots');
let active      = 0;
let dragging    = false;
let dragX       = 0;
let dragTarget  = null;
let timer       = null;
const N         = SERVICES.length;

// Build cards
SERVICES.forEach((s, i) => {
  const card = document.createElement('div');
  card.className = 'carousel-card';
  // Use textContent for title/desc to avoid XSS from data
  const bg      = document.createElement('div');
  bg.className  = 'carousel-card-bg';
  bg.style.backgroundImage = `url('${s.img}')`;

  const grad = document.createElement('div');
  grad.className = 'carousel-card-gradient';

  const shine = document.createElement('div');
  shine.className = 'carousel-card-shine';

  const content = document.createElement('div');
  content.className = 'carousel-card-content';

  const titleEl = document.createElement('div');
  titleEl.className = 'carousel-card-title';
  titleEl.textContent = s.title;

  const descEl = document.createElement('div');
  descEl.className = 'carousel-card-desc';
  descEl.textContent = s.desc;

  content.append(titleEl, descEl);
  card.append(bg, grad, shine, content);

  stage.appendChild(card);
});

// Build dots — real <button>s so they're keyboard-focusable and activatable
SERVICES.forEach((s, i) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'carousel-dot';
  dot.setAttribute('role', 'tab');
  dot.setAttribute('aria-label', `Show service: ${s.title}`);
  dot.setAttribute('aria-selected', 'false');
  dot.addEventListener('click', () => goTo(i));
  dotsEl.appendChild(dot);
});

function render() {
  const cards = stage.children;
  const dots  = dotsEl.children;
  // Tighter horizontal spread on small screens so the 270px cards
  // still peek in from the edges instead of sitting fully offscreen
  const spread = window.innerWidth <= 600 ? 190 : 300;

  for (let i = 0; i < N; i++) {
    let off = i - active;
    if (off >  N / 2) off -= N;
    if (off < -N / 2) off += N;

    const abs      = Math.abs(off);
    const isActive = off === 0;
    const visible  = abs <= 2;

    cards[i].style.display = visible ? '' : 'none';
    if (!visible) continue;

    const tx = off * spread;
    const tz = isActive ? 0 : -100 - abs * 60;
    const ry = off * -15;
    const sc = isActive ? 1 : 1 - abs * 0.08;
    const op = isActive ? 1 : 1 - abs * 0.35;

    cards[i].style.transition  = dragging
      ? 'none'
      : 'transform 0.65s cubic-bezier(0.32,0.72,0,1), opacity 0.65s cubic-bezier(0.32,0.72,0,1), box-shadow 0.65s ease';
    cards[i].style.transform   = `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${sc})`;
    cards[i].style.opacity     = op;
    cards[i].style.zIndex      = 10 - abs;
    cards[i].style.boxShadow   = isActive
      ? '0 40px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.25)'
      : '0 8px 32px rgba(0,0,0,0.2)';
    cards[i].style.cursor      = isActive ? 'default' : 'pointer';
    cards[i].querySelector('.carousel-card-bg').style.transform = isActive ? 'scale(1)' : 'scale(1.06)';
    cards[i].classList.toggle('is-active', isActive);
    dots[i].classList.toggle('is-active', isActive);
    dots[i].setAttribute('aria-selected', String(isActive));
  }
}

function goTo(i) {
  active = ((i % N) + N) % N;
  render();
  startTimer();
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => { active = (active + 1) % N; render(); }, 3500);
}

stage.addEventListener('pointerdown', e => {
  dragging    = true;
  dragX       = e.clientX;
  dragTarget  = e.target.closest('.carousel-card');
  stage.setPointerCapture(e.pointerId);
  clearInterval(timer);
});

stage.addEventListener('pointerup', e => {
  if (!dragging) return;
  const d = e.clientX - dragX;

  if (Math.abs(d) < 10 && dragTarget) {
    // Tap (no drag) — advance to the tapped card
    const idx = Array.from(stage.children).indexOf(dragTarget);
    if (idx !== -1 && idx !== active) {
      dragging = false;
      goTo(idx);
      return;
    }
  } else if (d < -40) {
    active = (active + 1) % N;
  } else if (d > 40) {
    active = (active - 1 + N) % N;
  }

  dragging    = false;
  dragTarget  = null;
  render();
  startTimer();
});

stage.addEventListener('pointerleave', () => {
  if (!dragging) return;
  dragging    = false;
  dragTarget  = null;
  render();
  startTimer();
});

render();
startTimer();

// Re-layout the carousel when crossing the mobile breakpoint
window.addEventListener('resize', render, { passive: true });

// ── CONTACT FORM ─────────────────────────────────────────────
// Posts to /api/contact (Cloudflare Worker) — Make.com URL
// never touches the browser. Honeypot + sessionStorage rate
// limit provide two layers of spam defence on the client side;
// the Worker adds a third layer server-side.

const RATE_LIMIT_KEY = 'rpd_last_submit';
const RATE_LIMIT_MS  = 5 * 60 * 1000; // 5 minutes

document.getElementById('contact-form').addEventListener('submit', async e => {
  e.preventDefault();

  const btn       = document.getElementById('submit-btn');
  const errorEl   = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const form      = e.target;

  // Client-side rate limit
  const lastSubmit = sessionStorage.getItem(RATE_LIMIT_KEY);
  if (lastSubmit && Date.now() - parseInt(lastSubmit, 10) < RATE_LIMIT_MS) {
    errorEl.textContent = "You've already sent an enquiry — give it a few minutes, or call David directly on 0401 769 948.";
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Sending…';
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    form['f-name'].value,
        email:   form['f-email'].value,
        suburb:  form['f-suburb'].value,
        message: form['f-message'].value,
        website: form['website'].value, // honeypot — Worker checks this too
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Request failed');

    sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
    form.style.display      = 'none';   // .form-title lives inside the form, so it hides too
    successEl.style.display = 'block';
    successEl.focus();                  // move focus so screen readers announce the outcome

  } catch (err) {
    errorEl.textContent   = err.message.length < 120
      ? err.message
      : 'Something went wrong — please try again or call David on 0401 769 948.';
    errorEl.style.display = 'block';
    btn.disabled          = false;
    btn.textContent       = 'Send Enquiry';
  }
});

// ── STICKY CTA + BACK TO TOP ─────────────────────────────────
const stickyCta = document.getElementById('sticky-call');
const backToTop = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  const nearBottom =
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 220;

  // Hide CTA when near the footer so it doesn't clash
  stickyCta.classList.toggle('show', window.scrollY > 400 && !nearBottom);
  backToTop.classList.toggle('show', nearBottom);
}, { passive: true });

// Back-to-top click — bound here because inline onclick is blocked by the CSP
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── CONTACT FORM WIGGLE ON SCROLL INTO VIEW ──────────────────
const formCard = document.querySelector('.contact-form-card');
if (formCard) {
  const wiggleObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      // Small delay so the user sees the card settle first
      setTimeout(() => {
        formCard.classList.add('wiggle');
        formCard.addEventListener('animationend', () => {
          formCard.classList.remove('wiggle');
        }, { once: true });
      }, 250);
      wiggleObs.disconnect();
    }
  }, { threshold: 0.4 });
  wiggleObs.observe(formCard);
}
