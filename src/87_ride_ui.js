'use strict';

const RideUI = (() => {
  const canvas = document.getElementById('c');
  const menu = document.getElementById('ride-menu');
  const overlay = document.getElementById('ride-interface');
  const filmEntry = document.getElementById('ride-film-entry');
  const filmLanguage = document.getElementById('ride-film-language');
  const location = document.getElementById('ride-location');
  const progress = document.getElementById('ride-progress');
  const speedometer = document.getElementById('ride-speed');
  const motion = document.getElementById('ride-motion');
  const combo = document.getElementById('ride-combo');
  const comboLabel = document.getElementById('ride-combo-label');
  const panel = document.getElementById('ride-panel');
  const panelToggle = document.getElementById('ride-panel-toggle');
  const panelClose = document.getElementById('ride-panel-close');
  const viewInfo = document.getElementById('ride-view-info');
  const panelBody = document.getElementById('ride-panel-body');
  const actionsTab = document.getElementById('ride-show-actions');
  const scenesTab = document.getElementById('ride-show-scenes');
  const actionList = document.getElementById('ride-command-list');
  const sceneList = document.getElementById('ride-scene-list');
  const sceneOverlay = document.getElementById('ride-scene');
  const sceneTitle = document.getElementById('ride-scene-title');
  const sceneDetail = document.getElementById('ride-scene-detail');
  const sceneProgress = document.getElementById('ride-scene-progress');
  const holds = new Map();
  const languageButtons = document.querySelectorAll('[data-language-toggle]');
  const translations = [];
  let onControl, returnFocus, currentScene;

  function bindText(element, value, attribute) {
    function translate() {
      const localized = I18n.text(value);
      if (attribute) element.setAttribute(attribute, localized);
      else renderText(element, localized);
    }
    translate();
    translations.push(translate);
  }

  for (const element of document.querySelectorAll('[data-en-text]')) {
    bindText(element, [element.textContent, element.dataset.enText]);
  }
  for (const [dataAttribute, attribute] of [['data-en-label', 'aria-label'], ['data-en-title', 'title']]) {
    for (const element of document.querySelectorAll(`[${dataAttribute}]`)) {
      bindText(element, [element.getAttribute(attribute), element.getAttribute(dataAttribute)], attribute);
    }
  }

  function refreshLocale() {
    for (const translate of translations) translate();
    for (const button of languageButtons) {
      const english = button.dataset.languageToggle === 'long' ? 'English' : 'EN';
      const hint = I18n.t('Switch to English', '切换到中文');
      renderText(button, I18n.t(english, '中文'));
      button.lang = I18n.t('en', 'zh-CN');
      button.title = hint;
      button.setAttribute('aria-label', hint);
    }
    setScene(currentScene);
  }

  for (const button of languageButtons) button.addEventListener('click', () => I18n.toggle());
  I18n.subscribe(refreshLocale);
  refreshLocale();

  function press(source, button) {
    if (holds.has(source)) return;
    const name = button.dataset.rideHold;
    const alreadyHeld = [...holds.values()].some(other => other.dataset.rideHold === name);
    holds.set(source, button);
    button.setAttribute('data-held', '');
    if (!alreadyHeld) onControl(name, true);
  }

  function release(source) {
    const button = holds.get(source);
    if (!button) return;
    holds.delete(source);
    const others = [...holds.values()];
    if (!others.includes(button)) button.removeAttribute('data-held');
    const name = button.dataset.rideHold;
    if (!others.some(other => other.dataset.rideHold === name)) onControl(name, false);
  }

  function releaseAll() {
    for (const source of holds.keys()) release(source);
  }

  function releasePanel() {
    for (const [source, button] of holds) if (panel.contains(button)) release(source);
  }

  function makeCommand({ id, label, key, detail, hold }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ride-button ride-command';
    if (hold) button.dataset.rideHold = id;
    else button.dataset.rideAction = id;

    const title = document.createElement('span');
    title.className = 'ride-command-title';
    bindText(title, label);
    button.append(title);
    if (key) {
      const hint = document.createElement('kbd');
      hint.className = 'ride-key';
      bindText(hint, key);
      button.append(hint);
    }
    if (detail) {
      const description = document.createElement('span');
      description.className = 'ride-command-detail';
      bindText(description, detail);
      button.append(description);
    }
    return button;
  }

  function populate(groups, scenes) {
    for (const { label, actions } of groups) {
      const group = document.createElement('section');
      group.className = 'ride-command-group';
      const title = document.createElement('h3');
      bindText(title, label);
      const grid = document.createElement('div');
      grid.className = 'ride-command-grid';
      grid.append(...actions.map(makeCommand));
      group.append(title, grid);
      actionList.append(group);
    }
    sceneList.append(...scenes.map(makeCommand));
    scenesTab.hidden = !scenes.length;
  }

  function showTab(scenes) {
    releasePanel();
    actionList.hidden = scenes;
    sceneList.hidden = !scenes;
    actionsTab.setAttribute('aria-pressed', String(!scenes));
    scenesTab.setAttribute('aria-pressed', String(scenes));
    panelBody.scrollTop = 0;
  }

  function closePanel({ focus = true } = {}) {
    if (panel.hidden) return false;
    releasePanel();
    panel.hidden = true;
    panelToggle.setAttribute('aria-expanded', 'false');
    if (focus) (returnFocus || panelToggle).focus({ preventScroll: true });
    return true;
  }

  function togglePanel(event) {
    if (overlay.hidden || closePanel()) return false;
    returnFocus = event && !event.detail ? panelToggle : canvas;
    panel.hidden = false;
    panelToggle.setAttribute('aria-expanded', 'true');
    panel.focus({ preventScroll: true });
    return true;
  }

  function bindHold(button) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(event.pointerId, button);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => release(event.pointerId));
    }
    function keyboardHold(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      const source = `key:${event.key}`;
      if (event.type === 'keydown') press(source, button);
      else release(source);
    }
    button.addEventListener('keydown', keyboardHold);
    button.addEventListener('keyup', keyboardHold);
    button.addEventListener('blur', () => {
      for (const [source, active] of holds) {
        if (active === button && typeof source === 'string') release(source);
      }
    });
  }

  function install({ select, control, action, groups = [], scenes = [] }) {
    onControl = control;
    populate(groups, scenes);
    panelToggle.addEventListener('click', togglePanel);
    panelClose.addEventListener('click', () => closePanel());
    actionsTab.addEventListener('click', () => showTab(false));
    scenesTab.addEventListener('click', () => showTab(true));
    for (const button of document.querySelectorAll('[data-ride-mode]')) {
      button.addEventListener('click', () => select(button.dataset.rideMode));
    }
    for (const button of document.querySelectorAll('[data-ride-action]')) {
      button.addEventListener('click', () => action(button.dataset.rideAction));
    }
    for (const button of document.querySelectorAll('[data-ride-hold]')) bindHold(button);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseAll();
    });
  }

  function ready() {
    document.getElementById('bar').hidden = true;
    document.getElementById('st').hidden = true;
    menu.hidden = false;
  }

  function setMode(mode) {
    releaseAll();
    const riding = mode === 'ride';
    if (!riding) closePanel({ focus: false });
    overlay.hidden = !riding;
    filmEntry.hidden = filmLanguage.hidden = mode !== 'film';
    sceneOverlay.hidden = mode !== 'scene';
    document.body.classList.toggle('ride-active', riding);
  }

  function renderText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function setScene(scene) {
    currentScene = scene;
    const { label, detail, progress: fraction } = scene || {};
    renderText(sceneTitle, I18n.text(label || ['位点演出', 'Film Scene']));
    renderText(sceneDetail, detail ? I18n.text(detail) : '');
    sceneDetail.hidden = !detail;
    sceneProgress.hidden = !Number.isFinite(fraction);
    if (!sceneProgress.hidden) sceneProgress.value = Math.max(0, Math.min(1, fraction));
  }

  function update({ speed, location: destination, visited, total, status, style, camera, scene }) {
    const label = destination || I18n.t('自由骑行', 'Free Ride');
    const count = total ? `${I18n.t('探索', 'Visited')} ${visited} / ${total}` : '';
    const reading = Number.isFinite(speed) ? `${Math.round(speed * 3.6)} ${I18n.t('公里/时', 'km/h')}` : '';
    const view = [style, camera].filter(Boolean).join(' · ');
    const comboName = typeof scene === 'string' || Array.isArray(scene) ? scene : scene?.label;
    const activeCombo = comboName ? I18n.text(comboName) : '';
    renderText(location, label);
    renderText(progress, count);
    renderText(speedometer, reading);
    renderText(motion, status || '');
    renderText(viewInfo, view);
    renderText(comboLabel, activeCombo);
    if (activeCombo) {
      const accessibleName = I18n.t(`结束组合 ${activeCombo}`, `Cancel combo: ${activeCombo}`);
      if (combo.getAttribute('aria-label') !== accessibleName) combo.setAttribute('aria-label', accessibleName);
    }
    motion.hidden = !status;
    viewInfo.hidden = !view;
    combo.hidden = !activeCombo;
  }

  return { install, ready, setMode, update, setScene, togglePanel, closePanel, get panelOpen() { return !panel.hidden; } };
})();
