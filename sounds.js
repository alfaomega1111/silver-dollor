(() => {
  'use strict';
  const toggle = document.querySelector('.sfx-toggle');
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!toggle || !Audio) return;
  const preferenceKey = 'ao-interface-sounds';
  let enabled = true, context, master, noise, lastSound = -Infinity;
  try {enabled = localStorage.getItem(preferenceKey) !== 'off';} catch (_) {}
  const render = () => {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Выключить звуковые эффекты' : 'Включить звуковые эффекты');
    toggle.title = enabled ? 'Звуки интерфейса включены' : 'Звуки интерфейса выключены';
  };
  const initialize = () => {
    if (context && context.state !== 'closed') return;
    context = new Audio();
    master = context.createGain();
    master.gain.value = enabled ? 0.13 : 0;
    master.connect(context.destination);
    noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.19), context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i=0;i<samples.length;i++) samples[i] = Math.random()*2-1;
  };
  const tone = (start, end, time, duration, level = 0.22, shape = 'sine') => {
    const source = context.createOscillator(), envelope = context.createGain();
    source.type = shape;
    source.frequency.setValueAtTime(start,time);
    source.frequency.exponentialRampToValueAtTime(end,time+duration);
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(level,time+0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    source.connect(envelope);envelope.connect(master);
    source.start(time);source.stop(time+duration+0.015);
    source.onended = () => {source.disconnect();envelope.disconnect();};
  };
  const sweep = time => {
    const source=context.createBufferSource(), filter=context.createBiquadFilter(), envelope=context.createGain();
    source.buffer=noise;filter.type='lowpass';filter.Q.value=0.6;
    filter.frequency.setValueAtTime(1500,time);filter.frequency.exponentialRampToValueAtTime(260,time+0.16);
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(0.16,time+0.018);envelope.gain.exponentialRampToValueAtTime(0.0001,time+0.17);
    source.connect(filter);filter.connect(envelope);envelope.connect(master);source.start(time);source.stop(time+0.18);
    source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
  };
  const synthesize = kind => {
    const time=context.currentTime+0.004;
    switch(kind){
      case 'navigate': sweep(time);tone(310,220,time,0.12,0.13);break;
      case 'select': tone(460,560,time,0.075,0.19);tone(690,740,time+0.035,0.09,0.1);break;
      case 'open': tone(280,470,time,0.13,0.19);tone(560,610,time+0.03,0.1,0.08);break;
      case 'close': tone(440,260,time,0.095,0.17);break;
      case 'confirm': tone(490,490,time,0.095,0.18);tone(735,735,time+0.055,0.12,0.12);break;
      default: tone(540,350,time,0.045,0.18,'triangle');
    }
  };
  const play = kind => {
    if (!enabled || document.hidden) return;
    const now=performance.now();
    if(now-lastSound<85)return;
    lastSound=now;
    try {
      initialize();
      const run=()=>{if(enabled&&!document.hidden&&context.state==='running')synthesize(kind);};
      if(context.state==='suspended'||context.state==='interrupted')context.resume().then(run).catch(()=>{});
      else run();
    } catch (_) { /* Sound must never interrupt navigation or other controls. */ }
  };
  const mute = () => {
    if(!master||!context||context.state==='closed')return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(enabled?0.13:0,context.currentTime,0.008);
  };
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    try{localStorage.setItem(preferenceKey,enabled?'on':'off');}catch(_){}
    mute();render();
    if(enabled){lastSound=-Infinity;play('select');}
  });
  const classify = control => {
    if(control.matches('.sfx-toggle') || control.matches(':disabled, [aria-disabled="true"]'))return null;
    if(control.matches('[data-stage], [data-photo-mode], .faq-filters button')){
      if(control.getAttribute('aria-selected')==='true'||control.getAttribute('aria-pressed')==='true')return null;
      return 'select';
    }
    if(control.matches('input[type=radio]'))return 'select';
    if(control.matches('.menu-toggle'))return control.getAttribute('aria-expanded')==='true'?'close':'open';
    if(control.matches('[data-close-dialog], [data-skip-intro]'))return 'close';
    if(control.matches('[data-open-dialog]'))return 'open';
    if(control.matches('summary'))return control.closest('details')?.open?'close':'open';
    if(control.matches('a[href]')){
      try{
        const destination=new URL(control.href,window.location.href);
        const current=new URL(window.location.href);
        if(destination.origin!==current.origin)return 'confirm';
        if(destination.pathname!==current.pathname)return 'navigate';
      }catch(_){}
      return 'tap';
    }
    return 'tap';
  };
  // Capture reads the state before existing menu, tab and disclosure handlers run.
  document.addEventListener('click',event=>{
    if(!event.isTrusted||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const control=event.target.closest?.('a[href], button, summary, input[type=radio]');
    if(!control)return;
    const kind=classify(control);
    if(kind)play(kind);
  },{capture:true});
  document.addEventListener('keydown',event=>{
    if(event.repeat)return;
    if(event.key==='Escape' && (document.querySelector('dialog[open]')||document.querySelector('.menu-toggle[aria-expanded="true"]')))play('close');
    else if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&event.target.matches?.('[role="tab"]'))play('select');
  },{capture:true});
  window.addEventListener('storage',event=>{
    if(event.key!==preferenceKey)return;
    enabled=event.newValue!=='off';mute();render();
  });
  window.addEventListener('pagehide',()=>{try{context?.suspend()?.catch(()=>{});}catch(_){};});
  render();toggle.hidden=false;
})();
