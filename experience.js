(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animateIn = element => {
    if (!reduced && typeof element.animate === 'function') element.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
  };
  // Site-wide search uses only the content already present on this site.
  const searchDialog = document.getElementById('quick-navigation');
  const searchToggle = document.querySelector('.quick-search-toggle');
  if (searchDialog && searchToggle && typeof searchDialog.showModal === 'function') {
    const input = document.getElementById('quick-query');
    const entries = Array.from(searchDialog.querySelectorAll('.quick-entry'));
    const count = searchDialog.querySelector('.quick-count');
    const empty = searchDialog.querySelector('.quick-empty');
    const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/(\d)\s+(?=\d)/g,'$1');
    const index = entries.map(entry=>normalize(entry.dataset.find));
    const filter = () => {
      const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
      let shown=0;
      entries.forEach((entry,i)=>{entry.hidden=!terms.every(term=>index[i].includes(term));if(!entry.hidden)shown++;});
      count.textContent=terms.length?`Найдено: ${shown}`:'Разделы и ответы на вопросы';
      empty.hidden=shown!==0;
    };
    const open = () => {
      if(document.querySelector('dialog[open]') && !searchDialog.open)return;
      if(searchDialog.open)return;
      input.value='';filter();searchDialog.showModal();input.focus();
    };
    searchToggle.addEventListener('click',open);
    searchDialog.querySelector('.quick-close').addEventListener('click',()=>searchDialog.close());
    searchDialog.addEventListener('click',event=>{
      if(event.target!==searchDialog)return;
      const rect=searchDialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)searchDialog.close();
    });
    input.addEventListener('input',filter);
    searchDialog.addEventListener('keydown',event=>{
      const visible=entries.filter(entry=>!entry.hidden);
      const position=visible.indexOf(document.activeElement);
      if(event.key==='ArrowDown'&&visible.length){event.preventDefault();visible[(position+1)%visible.length].focus();}
      else if(event.key==='ArrowUp'&&visible.length){event.preventDefault();if(position<=0)input.focus();else visible[position-1].focus();}
      else if(event.key==='Enter'&&event.target===input&&visible.length){event.preventDefault();visible[0].click();}
    });
    entries.forEach(entry=>entry.addEventListener('click',()=>searchDialog.close()));
    document.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();if(searchDialog.open)searchDialog.close();else open();
      }
    });
    const kbd=searchToggle.querySelector('kbd');
    if(kbd&&!/Mac|iPhone|iPad/.test(navigator.platform||''))kbd.textContent='Ctrl K';
    searchToggle.hidden=false;
  }
  const revealQuestion = () => {
    let id;try{id=decodeURIComponent(window.location.hash.slice(1));}catch(_){return;}
    if(!id.startsWith('faq-question-'))return;
    const question=document.getElementById(id);
    if(question?.tagName==='DETAILS'){
      if(question.hidden){document.querySelector('.faq-reset')?.click();question.scrollIntoView({block:'start',behavior:'auto'});}
      question.open=true;
    }
  };
  revealQuestion();window.addEventListener('hashchange',revealQuestion);

  // Preliminary collaboration format, based on the visitor's stated availability.
  document.querySelectorAll('.format-picker').forEach(widget=>{
    const form=widget.querySelector('.picker-form');
    const fields=Array.from(form.querySelectorAll('[data-picker-step]'));
    const controls=form.querySelector('.picker-controls');
    const progress=form.querySelector('.picker-progress');
    const progressText=form.querySelector('.picker-step-label');
    const progressBar=progress.querySelector('div span');
    const next=form.querySelector('.picker-next');
    const back=form.querySelector('.picker-back');
    const result=widget.querySelector('.picker-result');
    const summary=widget.querySelector('.picker-summary');
    let step=0;
    const showStep=(focus=false)=>{
      form.hidden=false;result.hidden=true;
      fields.forEach((field,i)=>{field.hidden=i!==step;field.tabIndex=-1;});
      next.disabled=!fields[step].querySelector('input:checked');
      next.textContent=step===fields.length-1?'Посмотреть вариант':'Дальше';
      back.disabled=step===0;
      progressText.textContent=`Вопрос ${step+1} из ${fields.length}`;
      progressBar.style.width=`${(step+1)/fields.length*100}%`;
      if(focus){fields[step].focus({preventScroll:true});animateIn(fields[step]);}
    };
    const checked = name => form.querySelector(`input[name="${name}"]:checked`);
    const showResult = () => {
      const goal=checked('goal').value,time=checked('time').value;
      let title='Начать с личной консультации',description='Сначала познакомимся и обсудим твои возможности. Никита предложит вариант с учётом целей и доступного времени.';
      if(goal==='once'||(goal==='explore'&&time==='one')){
        title='Обсудить разовый формат';description='Ты выбрал участие без постоянной занятости. На консультации можно разобрать программу с одним согласованным действием и условия выплаты.';
      }else if(goal==='regular'&&time==='evening'){
        title='Обсудить регулярный формат';description='Ты готов уделять проекту 2–3 часа вечером. Обсудим регулярное сотрудничество, задачи и личное сопровождение.';
      }
      widget.querySelector('.picker-copy-status').textContent='';
      widget.querySelector('.picker-result-title').textContent=title;
      widget.querySelector('.picker-result-description').textContent=description;
      const names={goal:'Цель',time:'Время',experience:'Опыт'};
      summary.value=Object.entries(names).map(([key,label])=>`${label}: ${checked(key).closest('label').querySelector('strong').textContent}`).join('\n');
      form.hidden=true;result.hidden=false;animateIn(result);
      const heading=result.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});
    };
    next.addEventListener('click',()=>{if(!checked(fields[step].querySelector('input').name))return;if(step<fields.length-1){step++;showStep(true);}else showResult();});
    back.addEventListener('click',()=>{if(step>0){step--;showStep(true);}});
    form.addEventListener('change',()=>{next.disabled=!fields[step].querySelector('input:checked');});
    form.addEventListener('submit',event=>{event.preventDefault();if(!next.disabled)next.click();});
    widget.querySelector('.picker-restart').addEventListener('click',()=>{step=0;showStep(true);});
    widget.querySelector('.picker-copy').addEventListener('click',async()=>{
      const status=widget.querySelector('.picker-copy-status');
      try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(summary.value);status.textContent='Ответы скопированы — можно вставить их в сообщение Никите.';}
      catch(_){summary.focus();summary.select();status.textContent='Выдели и скопируй ответы из поля выше.';}
    });
    controls.hidden=false;progress.hidden=false;showStep();
  });

  // Draggable photo comparison, with a native keyboard-accessible range control.
  document.querySelectorAll('[data-comparison]').forEach(comparison=>{
    const wrap=comparison.querySelector('.comparison-range-wrap');
    if(!wrap)return;
    const viewport=wrap.querySelector('.compare-viewport'),range=wrap.querySelector('.compare-range');
    const buttons=Array.from(comparison.querySelectorAll('[data-photo-mode]'));
    const grid=comparison.querySelector('.comparison-grid');
    const update=()=>{
      const value=Math.max(0,Math.min(100,Number(range.value)||0));
      viewport.style.setProperty('--split',`${value}%`);
      range.setAttribute('aria-valuetext',`Было: ${Math.round(value)}%, стало: ${100-Math.round(value)}%`);
    };
    const mode=value=>{
      comparison.dataset.photoMode=value;
      wrap.hidden=value!=='slider';grid.hidden=value==='slider';
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoMode===value)));
    };
    buttons.forEach(button=>button.addEventListener('click',()=>mode(button.dataset.photoMode)));
    range.addEventListener('input',update);
    const position=event=>{const rect=viewport.getBoundingClientRect();if(rect.width<=0)return;range.value=String(Math.round(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*100));update();};
    let dragging=false;
    viewport.addEventListener('pointerdown',event=>{if(event.button>0)return;dragging=true;viewport.setPointerCapture?.(event.pointerId);position(event);});
    viewport.addEventListener('pointermove',event=>{if(dragging)position(event);});
    viewport.addEventListener('pointerup',()=>{dragging=false;});
    viewport.addEventListener('pointercancel',()=>{dragging=false;});
    mode('slider');update();
  });

  // Pointer motion only runs on fine-pointer devices and respects reduced motion.
  const hero=document.querySelector('.hero');
  if(hero&&!reduced&&window.matchMedia('(hover: hover) and (pointer: fine)').matches&&!navigator.connection?.saveData){
    const portrait=hero.querySelector('.portrait-block');let frame=0,point;
    hero.addEventListener('pointermove',event=>{
      point={x:event.clientX,y:event.clientY};if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;const bounds=hero.getBoundingClientRect();
        hero.style.setProperty('--pointer-x',`${(point.x-bounds.left)/bounds.width*100}%`);
        hero.style.setProperty('--pointer-y',`${(point.y-bounds.top)/bounds.height*100}%`);
        if(portrait){const p=portrait.getBoundingClientRect();portrait.style.setProperty('--tilt-y',`${Math.max(-3,Math.min(3,(point.x-p.left-p.width/2)/p.width*6))}deg`);portrait.style.setProperty('--tilt-x',`${Math.max(-2,Math.min(2,-(point.y-p.top-p.height/2)/p.height*4))}deg`);}
      });
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{if(frame)window.cancelAnimationFrame(frame);frame=0;hero.style.removeProperty('--pointer-x');hero.style.removeProperty('--pointer-y');portrait?.style.removeProperty('--tilt-x');portrait?.style.removeProperty('--tilt-y');});
  }
})();
