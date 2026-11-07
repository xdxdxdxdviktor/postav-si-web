/* IT Herna – společné funkce: lišta, zvuky, hlas, konfety, toast, QR, návrat do herny po nečinnosti */
(function(){
  const H = window.Herna = {};
  const $ = s => document.querySelector(s);
  H.$ = $;
  H.esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // ---------- zvuk ----------
  let AC = null;
  H.muted = false;
  try { H.muted = localStorage.getItem('psw-mute') === '1'; } catch(e){}
  H.ac = function(){ if (!AC){ try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if (AC && AC.state === 'suspended') AC.resume(); return AC; };
  H.tone = function(f, t0, d, type = 'sine', vol = .12, f2){
    const a = H.ac(); if (!a) return; const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
  };
  const SFX = {
    click: () => H.tone(900, 0, .04, 'triangle', .035),
    pop: () => H.tone(480, 0, .13, 'sine', .16, 1000),
    ding: () => { H.tone(880, 0, .16, 'sine', .11); H.tone(1320, .08, .28, 'sine', .09); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => H.tone(f, i * .09, .25, 'triangle', .13)),
    bad: () => { H.tone(220, 0, .18, 'sawtooth', .06, 150); },
    whoosh: () => H.tone(260, 0, .28, 'sawtooth', .025, 900),
    blip: () => H.tone(1200, 0, .05, 'square', .025, 1500)
  };
  H.sfx = k => { if (H.muted) return; try { SFX[k] && SFX[k](); } catch(e){} };

  // ---------- hlas ----------
  let voice = null;
  function pick(){
    try {
      const score = v => (/premium/i.test(v.name) ? 60 : 0) + (/natural|online/i.test(v.name) ? 55 : 0) + (/enhanced|vylepšen/i.test(v.name) ? 45 : 0) + (/google/i.test(v.name) ? 20 : 0);
      const vs = speechSynthesis.getVoices().filter(x => /^cs/i.test(x.lang)).sort((a, b) => score(b) - score(a));
      let saved = ''; try { saved = localStorage.getItem('psw-voice') || ''; } catch(e){}
      voice = vs.find(v => v.voiceURI === saved) || vs[0] || null;
    } catch(e){}
  }
  try { pick(); speechSynthesis.onvoiceschanged = pick; } catch(e){}
  H.speak = function(t){
    if (H.muted || !voice) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(t).replace(/\p{Extended_Pictographic}|️|‍/gu, '').replace(/[„“]/g, '').replace(/…/g, ','));
      u.voice = voice; u.lang = voice.lang; u.rate = 1.02; u.pitch = 1.08; speechSynthesis.speak(u);
    } catch(e){}
  };

  // ---------- toast + konfety ----------
  let toastT;
  H.toast = function(t, ms = 2600){
    let el = $('#hToast'); if (!el){ el = document.createElement('div'); el.id = 'hToast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms);
  };
  H.confetti = function(x = innerWidth / 2, y = innerHeight / 3, n = 100, cols = ['#7c5cff','#00d4ff','#ffffff','#ffd200','#ff5e62','#22c55e']){
    for (let i = 0; i < n; i++){
      const d = document.createElement('div'); d.className = 'hcf'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.background = cols[i % cols.length];
      document.body.appendChild(d);
      const a = Math.random() * Math.PI * 2, v = 100 + Math.random() * 280, dx = Math.cos(a) * v, dy = Math.sin(a) * v - 160;
      d.animate([{transform:'translate(0,0) rotate(0)', opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${Math.random()*360}deg)`, opacity:1, offset:.4},{transform:`translate(${dx*1.3}px,${dy+420}px) rotate(${Math.random()*900}deg)`, opacity:0}], {duration:1400 + Math.random()*900, easing:'cubic-bezier(.2,.6,.4,1)'}).onfinish = () => d.remove();
    }
  };
  H.confettiAt = (el, n) => { const r = el.getBoundingClientRect(); H.confetti(r.left + r.width / 2, r.top + r.height / 3, n); };

  // ---------- QR (qrcode-generator) ----------
  H.qr = function(text, px = 180, ecc = 'M'){
    if (!window.qrcode) return '<small>QR není k dispozici</small>';
    const q = qrcode(0, ecc); q.addData(text); q.make();
    const cell = Math.max(2, Math.floor(px / (q.getModuleCount() + 4)));
    return q.createSvgTag(cell, cell * 2);
  };
  H.hex = s => [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');
  H.unhex = h => new TextDecoder().decode(new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16))));
  H.base = () => location.origin + location.pathname;

  // ---------- horní lišta ----------
  H.init = function(o = {}){
    const bar = document.createElement('header'); bar.className = 'hbar';
    bar.innerHTML = `<a class="hback" href="../">← Herna</a><div class="htitle"><span class="e">${o.emoji || ''}</span>${o.title || ''}</div><div class="hsp"></div>${o.extra || ''}<button class="hbtn" id="hMute" title="Zvuk">${H.muted ? '🔇' : '🔊'}</button>`;
    document.body.prepend(bar);
    $('#hMute').onclick = () => { H.muted = !H.muted; try { localStorage.setItem('psw-mute', H.muted ? '1' : '0'); speechSynthesis.cancel(); } catch(e){} $('#hMute').textContent = H.muted ? '🔇' : '🔊'; if (!H.muted) H.sfx('ding'); };
    document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('button')) H.sfx('click'); }, true);
    if (o.idle !== false) H.idle(o.idleSeconds || 90);
  };

  // ---------- nečinnost → zpět do herny ----------
  H.idle = function(sec){
    const ov = document.createElement('div'); ov.id = 'hIdle';
    ov.innerHTML = `<div><div style="font-size:70px">👋</div><h2>Jsi tu ještě?</h2><p>Za <b id="hCd">10</b> s se vrátíme do herny pro dalšího návštěvníka.</p><button class="btn-p">Ano, pokračuju</button></div>`;
    document.body.appendChild(ov);
    let t, iv, cd;
    const reset = () => { clearTimeout(t); clearInterval(iv); ov.classList.remove('on'); t = setTimeout(show, sec * 1000); };
    const show = () => { cd = 10; ov.classList.add('on'); tick(); iv = setInterval(tick, 1000); };
    const tick = () => { $('#hCd').textContent = cd; if (cd-- <= 0){ clearInterval(iv); location.href = '../'; } };
    ['pointerdown','keydown','input','wheel'].forEach(ev => addEventListener(ev, reset, {passive:true}));
    H.pauseIdle = () => { clearTimeout(t); clearInterval(iv); ov.classList.remove('on'); };
    H.resumeIdle = reset;
    reset();
  };
})();
