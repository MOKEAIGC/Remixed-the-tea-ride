'use strict';

// These beats drive the same controls and actions as a live ride.
const RideReplay = (() => {
  const market = [
    [0, 'cue', ['W + Shift · 穿过集市', 'W + Shift · Sprint through the market']],
    [0, 'control', 'forward', true],
    [0, 'control', 'sprint', true],
    [2.9, 'cue', ['Shift + F · 下起柠檬雨', 'Shift + F · Make it rain lemons']],
    [2.9, 'lemonRain'],
    [3.3, 'cameraMode', 2],
    [4.95, 'control', 'forward', false],
    [4.95, 'control', 'sprint', false],
    [5, 'cameraMode', 0],
  ];
  const pier = [
    [0, 'cue', ['G · 沿码头助跑起飞', 'G · Sprint off the pier']],
    [0, 'pierCombo'],
    [2.25, 'cameraMode', 2],
    [2.25, 'orbit', 8, -24],
    [3.93, 'cue', ['D · 侧倾掠过湖面', 'D · Bank over the lake']],
    [3.93, 'control', 'right', true],
    [4.77, 'control', 'right', false],
  ];
  const lanterns = [
    [0, 'cue', ['J · 在月夜放飞孔明灯', 'J · Launch sky lanterns in the moonlight']],
    [0, 'lanternCombo'],
    [3.25, 'cameraMode', 0],
    [3.25, 'cue', ['Shift + L · 再放一组孔明灯', 'Shift + L · Send up another wave']],
    [3.25, 'lanterns'],
  ];
  const lake = [
    [0, 'cue', ['K · 落水后停下来喝茶', 'K · Splash down for tea']],
    [0, 'landingCombo'],
    [2.2, 'cameraMode', 2],
    [2.2, 'zoom', -240],
  ];
  const at = (time, beats) => beats.map(([delay, ...beat]) => [time + delay, ...beat]);

  const scenes = [
    {
      id: 'gameplayTour', label: ['完整游玩演示', 'Full Gameplay Tour'],
      detail: ['从集市冲刺、码头起飞，到夜航放灯和湖上喝茶。', 'Sprint through the market, take off from the pier, launch sky lanterns and land for tea.'],
      key: '9', code: 'Digit9', duration: 24,
      beats: [...market, ...at(5.15, pier), ...at(10.15, lanterns), ...at(16.35, lake)],
    },
    ...[
      {
        id: 'gameplayMarket', label: ['集市冲刺与柠檬雨', 'Market Sprint & Lemon Rain'],
        detail: ['沿集市冲刺，用 Shift + F 让柠檬从天而降。', 'Dash through the market and use Shift + F to make it rain lemons.'],
        duration: 5.3, beats: market,
      },
      {
        id: 'gameplayPier', label: ['落日码头起飞', 'Sunset Pier Departure'],
        detail: ['用 G 助跑起飞，随后按 D 侧倾转向。', 'Use G for a running takeoff, then bank with D.'],
        duration: 5.1, beats: pier,
      },
      {
        id: 'gameplayLanterns', label: ['夜航放飞孔明灯', 'Moonlit Lantern Flight'],
        detail: ['从湖面起飞，穿过自己放飞的几组孔明灯。', 'Lift off from the lake and fly through waves of lanterns you release.'],
        duration: 6.3, beats: [[0, 'pose', -102, -16, Math.PI * .64], ...lanterns],
      },
      {
        id: 'gameplayLake', label: ['落湖喝茶', 'Splashdown & Tea'],
        detail: ['在月夜飞行，从空中降落湖面，再举杯喝茶。', 'Fly by moonlight, touch down on the lake and enjoy a sip of tea.'],
        duration: 9, beats: [
          [0, 'cue', ['空格 · 从湖面起飞', 'Space · Take off from the lake']],
          [0, 'pose', -112, -30, Math.PI * .65],
          [0, 'time', 2],
          [0, 'takeoff'],
          [1.1, 'lanterns'],
          ...at(2.25, lake),
        ],
      },
    ].map((scene, index) => ({ ...scene, key: `Shift + ${index + 6}`, code: `Digit${index + 6}`, shift: true })),
  ];

  let active;

  function start(scene, dispatch) {
    if (!scenes.includes(scene)) return false;
    active = { scene, dispatch, elapsed: 0, next: 0, cue: undefined, finished: false };
    return true;
  }

  function step(dt) {
    if (!active || active.finished || !Number.isFinite(dt) || dt < 0) return false;
    const replay = active;
    const { beats, duration } = replay.scene;
    replay.elapsed = Math.min(replay.elapsed + dt, duration);
    while (replay.next < beats.length && beats[replay.next][0] <= replay.elapsed + 1e-9) {
      const [, action, ...args] = beats[replay.next++];
      if (action === 'cue') replay.cue = args[0];
      else replay.dispatch(action, ...args);
      if (active !== replay) return false;
    }
    if (duration - replay.elapsed > 1e-9) return false;
    replay.elapsed = duration;
    replay.finished = true;
    return true;
  }

  return {
    scenes, start, step,
    stop() { active = undefined; },
    get progress() { return active ? active.elapsed / active.scene.duration : 0; },
    get cue() { return active?.cue; },
    get scene() { return active?.scene; },
  };
})();
