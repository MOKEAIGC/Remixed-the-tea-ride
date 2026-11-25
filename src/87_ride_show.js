'use strict';

const RideShow = (() => {
  const scenes = [
    { id: 'opening', label: ['开卷日出', 'Woodblock Sunrise'], detail: ['敲版上色，日出后进入立体世界', 'The print fills with colour and opens into a 3D world at sunrise.'], start: 0, end: 7.2 },
    { id: 'market', label: ['集市巡游', 'Market Ride'], detail: ['穿过灯笼街，遇见长颈鹿和乌龟', 'Ride down Lantern Street past a giraffe and a turtle.'], start: 7.2, end: 24 },
    { id: 'tea', label: ['茶摊小憩', 'Tea Break'], detail: ['举杯、抿茶，切入茶杯蒸汽特写', 'The rider takes a sip as the camera closes in on the steam.'], start: 24, end: 28.2 },
    { id: 'chase', label: ['柠檬追逐', 'Lemon Chase'], detail: ['柠檬撞过一排杯碟，最后被鹈鹕接住', 'A lemon bounces through the crockery before the pelican catches it.'], start: 28.2, end: 43.8 },
    { id: 'pier', label: ['夕阳码头', 'Sunset Takeoff'], detail: ['沿码头助跑，展开翅膀飞离木板', 'The pelican runs down the pier and takes flight.'], start: 43.8, end: 54.6 },
    { id: 'lanternFlight', label: ['穿越灯海', 'Flight Through Lanterns'], detail: ['夜航过热气球和孔明灯，骑手空中喝茶', 'Fly past balloons and sky lanterns while the rider sips tea.'], start: 54.6, end: 69.6 },
    { id: 'lake', label: ['月下落湖', 'Moonlit Splashdown'], detail: ['俯冲、溅水、减速漂浮，湖上再喝一口', 'Dive, splash down and drift on the lake with another sip of tea.'], start: 69.6, end: 78.6 },
    { id: 'closing', label: ['收画落印', 'Sealing the Print'], detail: ['月湖变回木版画，印章落下', 'The moonlit lake becomes a print again and receives its seal.'], start: 78.6, end: Score.DUR },
  ].map((scene, i) => ({ ...scene, key: String(i + 1), code: `Digit${i + 1}` }));

  const groups = [
    { label: ['移动与飞行', 'Movement & Flight'], actions: [
      { id: 'forward', label: ['前进', 'Move forward'], key: 'W / ↑', hold: true },
      { id: 'back', label: ['后退／减速', 'Reverse / brake'], key: 'S / ↓', hold: true },
      { id: 'left', label: ['左转', 'Turn left'], key: 'A / ←', hold: true },
      { id: 'right', label: ['右转', 'Turn right'], key: 'D / →', hold: true },
      { id: 'takeoff', label: ['展开翅膀', 'Take off'], key: ['空格', 'Space'], code: 'Space' },
      { id: 'land', label: ['自动降落', 'Auto-land'], key: 'C', code: 'KeyC' },
      { id: 'ascend', label: ['爬升', 'Climb'], key: 'Z', code: 'KeyZ', hold: true },
      { id: 'descend', label: ['下降', 'Descend'], key: 'X', code: 'KeyX', hold: true },
      { id: 'sprint', label: ['加速', 'Boost'], key: 'Shift', hold: true },
      { id: 'reset', label: ['返回起点', 'Reset ride'], key: 'R', code: 'KeyR' },
    ] },
    { label: ['骑手与道具', 'Rider & Props'], actions: [
      { id: 'honk', label: ['鹈鹕鸣叫', 'Honk'], key: 'Q', code: 'KeyQ' },
      { id: 'sip', label: ['喝茶', 'Sip tea'], key: 'E', code: 'KeyE' },
      { id: 'lemon', label: ['抛柠檬', 'Throw a lemon'], key: 'F', code: 'KeyF' },
      { id: 'lemonRain', label: ['柠檬雨', 'Lemon rain'], key: 'Shift + F', code: 'KeyF', shift: true },
      { id: 'lantern', label: ['放一盏孔明灯', 'Release a sky lantern'], key: 'L', code: 'KeyL' },
      { id: 'lanterns', label: ['放一组孔明灯', 'Release sky lanterns'], key: 'Shift + L', code: 'KeyL', shift: true },
    ] },
    { label: ['镜头与画面', 'Camera & Look'], actions: [
      { id: 'style', label: ['立体／木版画', '3D / woodblock'], key: 'P', code: 'KeyP' },
      { id: 'time', label: ['白昼／落日／月夜', 'Cycle time of day'], key: 'T', code: 'KeyT' },
      { id: 'camera', label: ['切换视角', 'Switch camera'], key: 'V', code: 'KeyV' },
      { id: 'fullscreen', label: ['全屏', 'Full screen'], key: 'O', code: 'KeyO' },
    ] },
    { label: ['音乐', 'Music'], actions: [
      { id: 'drum', label: ['敲鼓', 'Play drum'], key: 'B', code: 'KeyB' },
      { id: 'riff', label: ['弹一段筝', 'Play a koto riff'], key: 'Y', code: 'KeyY' },
      { id: 'score', label: ['展开乐谱', 'Toggle score'], key: 'N', code: 'KeyN' },
      { id: 'mute', label: ['切换静音', 'Toggle sound'], key: 'M', code: 'KeyM' },
      { id: 'pause', label: ['暂停／继续', 'Pause / resume'], key: 'I', code: 'KeyI' },
      ...['一', '二', '三', '四', '五'].map((note, i) => ({ id: `note${i}`, label: [`第${note}弦`, `String ${i + 1}`], key: `Shift + ${i + 1}`, code: `Digit${i + 1}`, shift: true })),
    ] },
    { label: ['动作组合', 'Action Combos'], actions: [
      { id: 'teaCombo', label: ['茶摊迎客', 'Tea Stall Welcome'], key: 'U', code: 'KeyU', detail: ['到茶摊，弹筝、喝茶，再鸣叫一声', 'Visit the tea stall, play koto, sip tea and honk.'] },
      { id: 'pierCombo', label: ['码头助跑起飞', 'Pier Takeoff'], key: 'G', code: 'KeyG', detail: ['到码头，切换落日，鸣叫、助跑、起飞', 'Go to the pier at sunset, honk, run and take off.'] },
      { id: 'lanternCombo', label: ['夜航放灯', 'Moonlit Lantern Flight'], key: 'J', code: 'KeyJ', detail: ['切换月夜，起飞，分批放飞孔明灯', 'Take flight by moonlight and release sky lanterns in waves.'] },
      { id: 'landingCombo', label: ['降落奉茶', 'Land for Tea'], key: 'K', code: 'KeyK', detail: ['接地或落水后，喝茶并放一盏灯', 'Land on the ground or water, sip tea and release a lantern.'] },
      { id: 'cancelCombo', label: ['结束组合', 'Stop combo'], key: 'Esc' },
    ] },
  ];

  const actionLookup = new Map();
  for (const { id, code, shift, hold } of [...groups.flatMap(group => group.actions), ...scenes]) {
    if (code && !hold) actionLookup.set(shift ? `shift:${code}` : code, id);
  }
  const actionFor = event => (event.shiftKey && actionLookup.get(`shift:${event.code}`)) || actionLookup.get(event.code);

  const times = [25, 49, 68], timeLabels = [['白昼', 'Daylight'], ['落日', 'Sunset'], ['月夜', 'Moonlight']];
  const styles = [['立体', '3D'], ['木版画', 'Woodblock']];
  let timeIndex = 0, time = times[0], print = false, printBlend = 0;
  function setTime(index) { timeIndex = index; }
  function resetLook() { timeIndex = 0; time = times[0]; print = false; printBlend = 0; }
  function styleFrame(dt) {
    printBlend = damp(printBlend, Number(print), 6, dt);
    time = damp(time, times[timeIndex], 3.2, dt);
    const amount = printBlend < .001 ? 0 : printBlend > .999 ? 1 : printBlend;
    LU.uPrint.value = amount;
    LU.uPrintC.value.x = .5;
    LU.uPrintC.value.y = .47;
    Post.fin.uBlocks.value.set(1, 1, 1, 1);
    Post.fin.uBorder.value = amount;
    Post.fin.uSeal.value = sm(.5, .99, amount);
    Post.fin.uFade.value = Post.fin.uFlash.value = 0;
  }

  const combos = {
    teaCombo: {
      steps: [[0, 'place', -38, 0], [0, 'time', 0], [.25, 'riff'], [.4, 'sip'], [2.55, 'honk']], end: 3.2,
    },
    pierCombo: {
      steps: [[0, 'place', -77, 0], [0, 'time', 1], [.15, 'honk'], [.28, 'drive'], [1.22, 'takeoff']], end: 3.2,
    },
    lanternCombo: {
      steps: [[0, 'time', 2], [0, 'takeoff'], [.55, 'riff'], [.85, 'lanterns'], [1.65, 'lanterns'], [2.5, 'lanterns']], end: 3.5,
    },
    landingCombo: {
      steps: [[0, 'land']], after: [[.25, 'sip'], [1.9, 'lantern'], [2.2, 'riff']], end: 2.8,
    },
  };
  let active;

  function startCombo(id, dispatch) {
    const combo = combos[id];
    if (!combo) return false;
    cancelCombo();
    const item = groups[4].actions.find(action => action.id === id);
    active = { ...combo, label: item.label, elapsed: 0, next: 0, waiting: Boolean(combo.after), dispatch };
    return true;
  }

  function cancelCombo() {
    if (!active) return false;
    const { dispatch } = active;
    active = undefined;
    dispatch('stopDrive');
    return true;
  }

  function stepCombo(dt) {
    if (!active) return;
    const combo = active;
    combo.elapsed += dt;
    while (combo.next < combo.steps.length && combo.steps[combo.next][0] <= combo.elapsed) {
      const [, name, ...args] = combo.steps[combo.next++];
      combo.dispatch(name, ...args);
      if (active !== combo) return;
    }
    if (combo.waiting) {
      if (Ride.state.mode === 'fly') {
        if (combo.elapsed > 28) cancelCombo();
        return;
      }
      Object.assign(combo, { steps: combo.after, waiting: false, next: 0, elapsed: 0 });
    } else if (combo.elapsed >= combo.end) cancelCombo();
  }

  return {
    scenes, groups, actionFor, startCombo, stepCombo, cancelCombo, resetLook, setTime, styleFrame,
    cycleTime() { setTime((timeIndex + 1) % times.length); return timeLabels[timeIndex]; },
    cycleStyle() { print = !print; return styles[Number(print)]; },
    view(ctx) { return { ...Ride.view(ctx), tod: time, lanGain: lerp(.35, 1.15, sm(55, 67, time)) }; },
    get label() { return `${I18n.text(styles[Number(print)])} · ${I18n.text(timeLabels[timeIndex])}`; },
    get combo() { return I18n.text(active?.label); },
  };
})();
