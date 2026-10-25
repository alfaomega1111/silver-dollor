(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-navigation');
  const header = document.querySelector('.header-shell');
  const dock = document.querySelector('.mobile-dock');
  let heroVisible = true;
  let contactVisible = false;
  const menuOpen = () => toggle?.getAttribute('aria-expanded') === 'true';
  const updateDock = () => {
    if (dock) dock.hidden = heroVisible || contactVisible || menuOpen();
  };
  const closeMenu = (returnFocus = false) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    updateDock();
    if (returnFocus) toggle.focus();
  };
  toggle?.addEventListener('click', () => {
    const open = !menuOpen();
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    updateDock();
    if (open) menu.querySelector('a')?.focus();
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuOpen()) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (menuOpen() && !header?.contains(event.target)) closeMenu();
  });
  header?.addEventListener('focusout', event => {
    if (menuOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
  if ('IntersectionObserver' in window && dock) {
    const hero = document.querySelector('.hero, .page-hero');
    const contact = document.getElementById('contact');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === contact) contactVisible = entry.isIntersecting;
      });
      updateDock();
    }, { threshold: 0 });
    if (hero) observer.observe(hero);
    if (contact) observer.observe(contact);
  }

  const tools = document.querySelector('.faq-tools');
  const search = document.getElementById('faq-search');
  const items = Array.from(document.querySelectorAll('#faq-list details'));
  const filters = Array.from(document.querySelectorAll('.faq-filters button'));
  const clear = document.querySelector('.search-clear');
  const count = document.querySelector('.faq-count');
  const empty = document.querySelector('.faq-empty');
  const reset = document.querySelector('.faq-reset');
  if (!tools || !search || !items.length) return;
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/(\d)\s+(?=\d)/g, '$1').trim();
  const texts = new Map(items.map(item => [item, normalize(item.textContent)]));
  let activeTopic = 'all';
  const applyFilters = () => {
    const query = normalize(search.value);
    const terms = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    items.forEach(item => {
      const topicMatch = activeTopic === 'all' || item.dataset.topic === activeTopic;
      const matches = topicMatch && terms.every(term => texts.get(item).includes(term));
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = `Показано ответов: ${visible}`;
    clear.hidden = !search.value;
    empty.hidden = visible !== 0;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === activeTopic)));
  };
  search.addEventListener('input', applyFilters);
  filters.forEach(button => button.addEventListener('click', () => {
    activeTopic = button.dataset.topic;
    applyFilters();
  }));
  clear.addEventListener('click', () => {
    search.value = '';
    applyFilters();
    search.focus();
  });
  reset.addEventListener('click', () => {
    search.value = '';
    activeTopic = 'all';
    applyFilters();
    search.focus();
  });
  tools.hidden = false;
  applyFilters();
})();

(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('main .section-heading h2, main .project h2, main .faq-heading h2, main .contact-top h2, main .results-heading h3, main .dima-editorial-heading h3, main .approach h2').forEach(element => element.classList.add('reveal', 'motion-title'));
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('will-reveal');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll('.reveal').forEach(element => {
      const peers = Array.from(element.parentElement.children).filter(peer => peer.classList.contains('reveal'));
      const index = Math.max(0, peers.indexOf(element));
      element.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 90}ms`);
      element.classList.add('will-reveal');
      observer.observe(element);
    });

  }
  document.querySelectorAll('[data-open-dialog]').forEach(link => {
    const dialog = document.getElementById(link.dataset.openDialog);
    if (!dialog || typeof dialog.showModal !== 'function') return;
    link.addEventListener('click', event => {
      event.preventDefault();
      dialog.showModal();
    });
  });
  document.querySelectorAll('.format-dialog').forEach(dialog => {
    dialog.querySelector('[data-close-dialog]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  });
  const intro = document.getElementById('brand-intro');
  let seen = false;
  try { seen = sessionStorage.getItem('ao-intro-v6') === '1'; } catch (_) { /* Session storage is optional. */ }
  const demo = new URLSearchParams(window.location.search).has('demo');
  if (!intro || typeof intro.showModal !== 'function' || reducedMotion || window.location.hash || (seen && !demo)) return;
  try { sessionStorage.setItem('ao-intro-v6', '1'); } catch (_) { /* Continue without persistence. */ }
  const previousFocus = document.activeElement;
  const finish = () => { if (intro.open) intro.close(); };
  intro.querySelector('[data-skip-intro]')?.addEventListener('click', finish);
  intro.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); }, {once:true});
  intro.showModal();
  window.setTimeout(finish, 1100);
})();

(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enter = element => {
    if (!reducedMotion && typeof element.animate === 'function') {
      element.animate([{opacity:0, transform:'translateY(14px)'}, {opacity:1, transform:'translateY(0)'}], {duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
  };
  document.querySelectorAll('[data-story]').forEach(story => {
    const tabs = story.querySelector('.story-tabs');
    const buttons = Array.from(tabs.querySelectorAll('[data-stage]'));
    const panels = Array.from(story.querySelectorAll('[data-story-panel]'));
    if (!buttons.length || buttons.length !== panels.length) return;
    tabs.setAttribute('role', 'tablist');
    buttons.forEach((button, index) => {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', button.id);
      panels[index].tabIndex = 0;
    });
    let active = 0;
    const select = (index, focus = false, animate = true) => {
      active = index;
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(index === i));
        button.tabIndex = index === i ? 0 : -1;
        panels[i].hidden = index !== i;
      });
      if (focus) buttons[index].focus({preventScroll:true});
      if (animate) enter(panels[index]);
    };
    buttons.forEach((button,index) => {
      button.addEventListener('click', () => select(index));
      button.addEventListener('keydown', event => {
        let next = active;
        if (event.key === 'ArrowRight') next = (active + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (active - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(0, false, false);
    tabs.hidden = false;
  });
  document.querySelectorAll('[data-comparison]').forEach(comparison => {
    const controls = comparison.querySelector('.photo-switch');
    const buttons = Array.from(controls.querySelectorAll('[data-photo-mode]'));
    const photos = Array.from(comparison.querySelectorAll('[data-photo]'));
    buttons.forEach(button => button.addEventListener('click', () => {
      const mode = button.dataset.photoMode;
      comparison.dataset.photoMode = mode;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      photos.forEach(photo => {
        photo.hidden = mode !== 'both' && photo.dataset.photo !== mode;
        if (!photo.hidden) enter(photo);
      });
    }));
    controls.hidden = false;
  });
  const progress = document.querySelector('.reading-progress');
  if (progress) {
    let scheduled = false;
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      scheduled = false;
    };
    const requestUpdate = () => {
      if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
    };
    window.addEventListener('scroll',requestUpdate,{passive:true});
    window.addEventListener('resize',requestUpdate);
    window.addEventListener('load',requestUpdate,{once:true});
    update();
  }
})();

(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const screen = document.querySelector('.transition-screen');
  const rail = document.querySelector('.section-tabs-track');
  const current = rail?.querySelector('[aria-current="page"]');
  if (current && rail) rail.scrollLeft = Math.max(0,current.offsetLeft - rail.clientWidth / 2 + current.offsetWidth / 2);
  let navigating = false;
  let timeout = 0;
  let animation;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || motion.matches || navigating || !screen) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const next = new URL(link.href, window.location.href);
    const here = new URL(window.location.href);
    if (next.origin !== here.origin || !['http:','https:'].includes(next.protocol)) return;
    if (!/\/(?:[a-z-]+\.html)?$/.test(next.pathname)) return;
    if (next.pathname === here.pathname || (next.pathname === '/index.html' && here.pathname === '/') || (next.pathname === '/' && here.pathname === '/index.html')) return;
    event.preventDefault();
    navigating = true;
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
    const menu = document.getElementById('mobile-navigation');
    if(menu)menu.hidden=true;
    const leave = () => { if (!navigating) return; window.clearTimeout(timeout); navigating=false; window.location.assign(next.href); };
    // Normal navigation preserves real URLs, browser history and opening in a new tab.
    if (typeof screen.animate === 'function') {
      animation=screen.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:300,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
      animation.finished.then(leave).catch(()=>{});
      timeout=window.setTimeout(leave,420);
    } else leave();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    navigating=false;
    window.clearTimeout(timeout);
    animation?.cancel();
    document.getAnimations?.().filter(item=>item.effect?.target===screen).forEach(item=>item.cancel());
  });
})();

