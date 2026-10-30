(() => {
  'use strict';
  const scenes = {
    welcome: { text: '와줬구나…! 우리 집에 놀러 올래?\n너 온다고 해서, 조금 신경 써봤어.', mood: '두근두근, 집들이 전날', image: 'assets/images/byeonggyu-photo-welcome.png', alt: '거실에서 핑크색 파자마를 입고 반기는 병규' },
    address: { text: '그, 그런 건 개인 정보니까…\n개인적으로 물어봐줘.\n너한테는… 알려줄게.', mood: '장소는… 우리끼리만 비밀 ♡', image: 'assets/images/byeonggyu-photo-shy.png', alt: '수줍게 가슴 앞에 두 손을 모은 병규' },
    schedule: { text: '10월 31일 저녁 7시부터… 11월 2일 아침 8시까지야.\n무려 0박 3일…!\n함께 있어줄 거지…?', mood: '10.31 SAT 19:00 — 11.02 MON 08:00', image: 'assets/images/byeonggyu-photo-schedule.png', alt: '손가락을 들어 집들이 시간을 설명하는 병규' },
    food: { text: '치킨이지…! 같이 먹으려고 준비했어.\n이, 이 앞치마는… 너 온다고 해서…!\n식기 전에 같이 먹자. ♡', mood: '오늘의 메뉴는 치킨, 그리고 수다 ♡', image: 'assets/images/byeonggyu-photo-food.png', alt: '프릴이 풍성한 분홍색 앞치마를 입고 치킨 접시를 든 병규' },
    bad: { text: '…정말 안 오는 거야?\n\n아까는 네가 온다고 상상하면서\n접시도 두 개 꺼내놨는데.\n\n괜찮아, 바쁜 거 알아.\n그러니까 미안하다고는 하지 마.\n네가 미안해하면… 내가 더 기다리게 되잖아.\n\n문 앞에 발소리가 날 때마다\n혹시 너일까 봐 숨을 죽였어.\n하지만 복도는 조용했고,\n식어버린 치킨만 우리 사이에 남았어.\n\n초대장을 다시 읽어봐도\n네 대답은 달라지지 않겠지.\n오늘은 여기까지 할게.\n잘 가, 그리고… 다음엔 기대하지 않을게.', mood: '초대는… 여기까지.', image: 'assets/images/byeonggyu-photo-bad.png', alt: '어두운 거실에서 팔짱을 낀 병규' },
    happy: { text: '진짜…? 와주는 거지?\n그럼 네 자리, 꼭 비워둘게.\n우리 집에서 만나. 기다리고 있을게…! ♡', mood: '네가 온다니, 이제 진짜 집들이야 ♡', image: 'assets/images/byeonggyu-photo-happy.png', alt: '두 팔을 펼쳐 기쁘게 반기는 병규' }
  };
  const endings = {
    bad: { label: 'BAD ENDING', heading: '네가 오지 않은 밤', note: '기다리던 마음이 조금 식어버렸다.' },
    happy: { label: 'HAPPY ENDING', heading: '너와 함께라서, 우리 집', note: '집은 준비됐고, 이제 우리가 만날 차례.' }
  };
  const game = document.querySelector('.game');
  const portrait = document.querySelector('.portrait');
  const portraitIncoming = document.querySelector('.portrait-incoming');
  const text = document.querySelector('#dialogue-text');
  const announcement = document.querySelector('#announcement');
  const choices = document.querySelector('#choices');
  const replyActions = document.querySelector('#reply-actions');
  const back = document.querySelector('#back-choice');
  const skip = document.querySelector('#skip');
  const hint = document.querySelector('#dialogue-hint');
  const mark = document.querySelector('#continue-mark');
  const mood = document.querySelector('#mood');
  const letterDialog = document.querySelector('#letter-dialog');
  const letterArrival = document.querySelector('#letter-arrival');
  const arrivalLetter = document.querySelector('#arrival-letter');
  const letterPaper = document.querySelector('.letter-paper');
  const letterContent = document.querySelector('#letter-content');
  const letterEnter = document.querySelector('#letter-enter');
  const letterReopen = document.querySelector('#letter-reopen');
  const letterReading = document.querySelector('#letter-reading');
  const scrollControls = document.querySelector('#letter-scroll-controls');
  const scrollToggle = document.querySelector('#letter-scroll-toggle');
  const scrollHint = document.querySelector('#letter-scroll-hint');
  const endingTitle = document.querySelector('#ending-title');
  const endingActions = document.querySelector('#ending-actions');
  const epilogueScreen = document.querySelector('#epilogue-screen');
  const epilogueLine = document.querySelector('#epilogue-line');
  const epilogueChoice = document.querySelector('#epilogue-choice');
  const epilogueCredits = document.querySelector('#epilogue-credits');
  const epilogueRestart = document.querySelector('#epilogue-restart');
  const epilogueCreditsButton = document.querySelector('#epilogue-credits-button');
  const creditsRestart = document.querySelector('#credits-restart');
  const endingLabel = document.querySelector('#ending-label');
  const endingHeading = document.querySelector('#ending-heading');
  const endingNote = document.querySelector('#ending-note');
  const accept = document.querySelector('#accept-choice');
  const questionGuide = document.querySelector('#question-guide');
  const restart = document.querySelector('#restart-choice');
  const pageDecline = document.querySelector('#page-decline');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let dialogueTransitionTimer = null;
  let onTextComplete = null;
  let fullText = scenes.welcome.text;
  let activeChoice = null;
  const visitedQuestions = new Set();
  let currentScene = 'welcome';
  let photoAnimation = null;
  const photos = new Map();
  for (const scene of Object.values(scenes)) {
    if (photos.has(scene.image)) continue;
    const image = new Image();
    const ready = new Promise(resolve => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
    });
    image.src = scene.image;
    photos.set(scene.image, ready);
  }

  function showPhoto(name) {
    const scene = scenes[name];
    photos.get(scene.image).then(loaded => {
      // An older load must not overwrite the visitor's latest selection.
      if (!loaded || currentScene !== name) return;
      if (photoAnimation) clearTimeout(photoAnimation);
      photoAnimation = null;
      const changed = portrait.getAttribute('src') !== scene.image;
      game.style.setProperty('--scene-image', `url("${scene.image}")`);
      if (!changed) {
        portraitIncoming.classList.remove('is-visible');
        return;
      }
      if (reducedMotion.matches) {
        portrait.src = scene.image;
        portrait.alt = scene.alt;
        portraitIncoming.classList.remove('is-visible');
        return;
      }
      portraitIncoming.classList.remove('is-visible');
      portraitIncoming.src = scene.image;
      requestAnimationFrame(() => portraitIncoming.classList.add('is-visible'));
      photoAnimation = setTimeout(() => {
        if (currentScene !== name) return;
        portrait.src = scene.image;
        portrait.alt = scene.alt;
        portraitIncoming.classList.remove('is-visible');
        photoAnimation = null;
      }, 1050);
    });
  }

  function finishText() {
    clearInterval(timer);
    clearTimeout(dialogueTransitionTimer);
    dialogueTransitionTimer = null;
    timer = null;
    text.textContent = fullText;
    text.classList.remove('dialogue-switching');
    skip.hidden = true;
    mark.hidden = Boolean(endings[currentScene]);
    hint.textContent = endings[currentScene] ? `이 이야기는 여기서 끝났습니다 · ${endings[currentScene].label}` : currentScene === 'welcome' ? '선택지를 눌러 이야기를 이어가세요' : '아직 궁금한 게 남았어?';
    if (document.activeElement === skip) {
      if (currentScene === 'happy' && onTextComplete) skip.blur();
      else (endings[currentScene] ? restart : currentScene === 'welcome' ? choices.querySelector('button') : back).focus({ preventScroll: true });
    }
    const complete = onTextComplete;
    onTextComplete = null;
    if (complete) complete();
  }

  function showScene(name, animate = true, revealEnding = true) {
    if (!Object.hasOwn(scenes, name)) return;
    clearInterval(timer);
    clearTimeout(dialogueTransitionTimer);
    dialogueTransitionTimer = null;
    onTextComplete = null;
    currentScene = name;
    showPhoto(name);
    fullText = scenes[name].text;
    game.dataset.scene = name;
    mood.textContent = scenes[name].mood;
    announcement.textContent = `병규: ${fullText}`;
    choices.hidden = name !== 'welcome';
    const ending = endings[name];
    replyActions.hidden = name === 'welcome' || Boolean(ending);
    endingTitle.hidden = !ending || !revealEnding;
    endingActions.hidden = !ending || !revealEnding;
    pageDecline.hidden = Boolean(ending) || name === 'happy';
    letterReopen.hidden = Boolean(ending) || name === 'happy';
    if (ending) {
      endingLabel.textContent = ending.label;
      endingHeading.textContent = ending.heading;
      endingNote.textContent = ending.note;
    }
    document.body.classList.toggle('bad-ending', name === 'bad');
    document.body.classList.toggle('happy-ending', name === 'happy');
    if (!animate || reducedMotion.matches) {
      finishText();
      return;
    }
    const typingSpeed = name === 'bad' ? 58 : 32;
    typeDialogue(fullText, typingSpeed);
  }

  function typeDialogue(line, speed, onComplete) {
    clearInterval(timer);
    clearTimeout(dialogueTransitionTimer);
    fullText = line;
    onTextComplete = onComplete;
    announcement.textContent = `병규: ${line}`;
    text.textContent = '';
    skip.hidden = reducedMotion.matches;
    mark.hidden = true;
    hint.textContent = '병규가 마음을 전하는 중…';
    if (reducedMotion.matches) {
      text.textContent = fullText;
      finishText();
      return;
    }
    text.classList.add('dialogue-switching');
    dialogueTransitionTimer = setTimeout(() => {
      dialogueTransitionTimer = null;
      text.textContent = '';
      text.classList.remove('dialogue-switching');
      const characters = Array.from(fullText);
      let position = 0;
      timer = setInterval(() => {
        position += 1;
        text.textContent = characters.slice(0, position).join('');
        if (position >= characters.length) finishText();
      }, speed);
    }, 260);
  }

  function beginHappyEnding() {
    pendingEnding = null;
    started = true;
    pauseLetterScroll();
    game.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    showScene('happy', false, false);
    game.classList.add('happy-anticipation');
    epilogueScreen.hidden = true;
    epilogueScreen.classList.remove('is-visible');
    epilogueChoice.hidden = true;
    epilogueChoice.classList.remove('is-visible');
    epilogueCredits.hidden = true;
    epilogueCredits.classList.remove('is-visible');
    typeDialogue('진짜 와주는 거야…? 잠깐만… 나 지금 너무 설레서 숨을 크게 한 번 쉬고 올게.', 82, () => {
      game.classList.remove('happy-anticipation');
      typeDialogue('왔어! 이제 진짜 집들이네. 네 자리는 제일 좋은 곳에 비워뒀어. 치킨도 제일 바삭한 걸로 남겨둘게!', 38, () => {
        typeDialogue('우리 오래오래 웃고 떠들자. 오늘을 생각하면 언제든 마음이 따뜻해질 수 있게… ♡', 54, () => {
          setTimeout(revealEpilogue, reducedMotion.matches ? 0 : 1200);
        });
      });
    });
  }

  function revealEpilogue() {
    game.classList.add('epilogue-fading');
    setTimeout(() => {
      epilogueScreen.hidden = false;
      requestAnimationFrame(() => epilogueScreen.classList.add('is-visible'));
      setTimeout(() => {
        epilogueLine.classList.add('is-visible');
        setTimeout(() => {
          epilogueChoice.hidden = false;
          requestAnimationFrame(() => {
            epilogueChoice.classList.add('is-visible');
            epilogueRestart.focus({ preventScroll: true });
          });
      }, reducedMotion.matches ? 0 : 1750);
    }, reducedMotion.matches ? 0 : 400);
    }, reducedMotion.matches ? 0 : 650);
  }

  choices.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => {
      activeChoice = button;
      button.classList.add('seen');
      visitedQuestions.add(button.dataset.choice);
      if (visitedQuestions.size === choices.querySelectorAll('[data-choice]').length) {
        accept.hidden = false;
        questionGuide.textContent = '이제 병규에게 마음을 전해도 좋아요.';
        questionGuide.classList.add('questions-complete');
      }
      showScene(button.dataset.choice);
      back.focus({ preventScroll: true });
    });
  });
  back.addEventListener('click', () => {
    showScene('welcome', false);
    (activeChoice || choices.querySelector('button')).focus({ preventScroll: true });
  });
  skip.addEventListener('click', finishText);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishText(); });
  let started = false;
  let pendingEnding = null;
  let returnFocus = null;
  let scrollFrame = null;
  let scrolling = false;
  const scrollSpeed = 80; // Pixels per second. The reader can always pause or scroll manually.

  function pauseLetterScroll(message = '직접 스크롤하며 읽어도 좋아요') {
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    scrolling = false;
    scrollToggle.textContent = '자동 스크롤';
    scrollToggle.setAttribute('aria-pressed', 'false');
    scrollHint.textContent = message;
  }

  function updateScrollControls() {
    const overflowing = letterReading.scrollHeight > letterReading.clientHeight + 2;
    scrollControls.hidden = !overflowing;
    if (!overflowing) pauseLetterScroll();
    return overflowing;
  }

  function startLetterScroll(delay = 0) {
    pauseLetterScroll();
    if (!letterDialog.open || !updateScrollControls()) return;
    const end = letterReading.scrollHeight - letterReading.clientHeight;
    if (letterReading.scrollTop >= end - 2) letterReading.scrollTop = 0;
    let position = letterReading.scrollTop;
    let previous = null;
    let begin = null;
    scrolling = true;
    scrollToggle.textContent = '잠시 멈추기';
    scrollToggle.setAttribute('aria-pressed', 'true');
    scrollHint.textContent = delay ? '잠시 후 천천히 내려가요' : '편지가 천천히 내려가고 있어요';
    function step(now) {
      if (!scrolling || !letterDialog.open) return;
      if (begin === null) begin = now + delay;
      if (now >= begin) {
        const elapsed = previous === null ? 0 : Math.min(now - previous, 64);
        position += elapsed * scrollSpeed / 1000;
        const bottom = Math.max(0, letterReading.scrollHeight - letterReading.clientHeight);
        letterReading.scrollTop = Math.min(position, bottom);
        if (position >= bottom) {
          pauseLetterScroll('편지의 마지막까지 읽었어요 ♡');
          scrollToggle.textContent = '처음부터 다시 읽기';
          return;
        }
        previous = now;
      }
      scrollFrame = requestAnimationFrame(step);
    }
    scrollFrame = requestAnimationFrame(step);
  }

  scrollToggle.addEventListener('click', () => {
    if (scrolling) pauseLetterScroll('잠시 멈췄어요. 편하게 읽어주세요');
    else startLetterScroll();
  });
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => {
    letterReading.addEventListener(type, () => pauseLetterScroll(), { passive: true });
  });
  letterReading.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) pauseLetterScroll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseLetterScroll('잠시 멈췄어요. 이어서 읽어주세요');
  });
  window.addEventListener('resize', () => { if (letterDialog.open) updateScrollControls(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pauseLetterScroll(); });
  // This HTML is authored in our local invitation-letter.js, never from visitors.
  if (typeof window.INVITATION_LETTER_HTML === 'string' && window.INVITATION_LETTER_HTML.trim()) {
    letterContent.innerHTML = window.INVITATION_LETTER_HTML.trim();
    letterContent.classList.add('letter-formatted');
  } else {
    letterContent.textContent = '우리 집에 놀러 올래?';
  }
  function openLetter() {
    returnFocus = document.activeElement;
    if (timer) finishText();
    letterArrival.hidden = true;
    letterPaper.hidden = false;
    letterDialog.classList.remove('arrival-only');
    if (!letterDialog.open) letterDialog.showModal();
    document.body.classList.add('letter-open');
    letterDialog.scrollTop = 0;
    letterReading.scrollTop = 0;
    letterReading.focus({ preventScroll: true });
    if (reducedMotion.matches) {
      pauseLetterScroll('직접 스크롤하며 읽어주세요');
      updateScrollControls();
    } else startLetterScroll(1000);
  }
  function openArrival() {
    returnFocus = document.activeElement;
    if (timer) finishText();
    pauseLetterScroll();
    letterArrival.hidden = false;
    letterPaper.hidden = true;
    letterDialog.classList.add('arrival-only');
    letterDialog.showModal();
    document.body.classList.add('letter-open');
    arrivalLetter.focus({ preventScroll: true });
  }
  arrivalLetter.addEventListener('click', openLetter);
  letterEnter.addEventListener('click', () => letterDialog.close());
  function showEnding(name) {
    pendingEnding = null;
    started = true;
    pauseLetterScroll();
    showScene(name);
    game.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    restart.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-decline]').forEach(button => {
    button.addEventListener('click', () => {
      if (letterDialog.open) {
        pendingEnding = 'bad';
        letterDialog.close();
      } else showEnding('bad');
    });
  });
  accept.addEventListener('click', beginHappyEnding);
  epilogueRestart.addEventListener('click', () => restart.click());
  creditsRestart.addEventListener('click', () => restart.click());
  epilogueCreditsButton.addEventListener('click', () => {
    epilogueChoice.classList.remove('is-visible');
    setTimeout(() => {
      epilogueChoice.hidden = true;
      epilogueCredits.hidden = false;
      requestAnimationFrame(() => {
        epilogueCredits.classList.add('is-visible');
        creditsRestart.focus({ preventScroll: true });
      });
    }, reducedMotion.matches ? 0 : 450);
  });
  restart.addEventListener('click', () => {
    started = false;
    activeChoice = null;
    visitedQuestions.clear();
    accept.hidden = true;
    questionGuide.textContent = '세 가지 질문을 모두 살펴보면 초대에 답할 수 있어요.';
    questionGuide.classList.remove('questions-complete');
    game.classList.remove('happy-anticipation');
    game.classList.remove('epilogue-fading');
    epilogueScreen.hidden = true;
    epilogueScreen.classList.remove('is-visible');
    epilogueLine.classList.remove('is-visible');
    epilogueChoice.hidden = true;
    epilogueChoice.classList.remove('is-visible');
    epilogueCredits.hidden = true;
    epilogueCredits.classList.remove('is-visible');
    restart.textContent = '↶ 처음부터 다시 시작';
    choices.querySelectorAll('[data-choice]').forEach(button => button.classList.remove('seen'));
    showScene('welcome', false);
    openArrival();
  });
  letterDialog.addEventListener('close', () => {
    pauseLetterScroll();
    document.body.classList.remove('letter-open');
    if (pendingEnding) {
      showEnding(pendingEnding);
      return;
    }
    if (!started) {
      started = true;
      showScene('welcome');
      choices.querySelector('button').focus({ preventScroll: true });
    } else if (returnFocus && typeof returnFocus.focus === 'function') {
      returnFocus.focus({ preventScroll: true });
    }
  });
  letterReopen.addEventListener('click', openLetter);
  openArrival();
})();
