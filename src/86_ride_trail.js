'use strict';

const RideTrail = (() => {
  const stops = [
    { name: '集市入口', x: -25, z: 0, note: 78 },
    { name: '茶摊街', x: -50, z: 0, note: 84 },
    { name: '湖边码头', x: -82, z: 0, note: 90 },
  ];
  const ring = new THREE.RingGeometry(1.72, 1.84, 64).rotateX(-Math.PI / 2);
  const diamond = new THREE.OctahedronGeometry(.23);
  const amber = new THREE.MeshBasicMaterial({ color: '#f6b63d', side: THREE.DoubleSide });
  const jade = new THREE.MeshBasicMaterial({ color: '#44a89a', side: THREE.DoubleSide });
  let markers;

  function setActive(scene, active) {
    if (active && !markers) {
      markers = new THREE.Group();
      markers.name = 'ride-checkpoints';
      for (const stop of stops) {
        const ground = Arch.ground(stop.x, stop.z);
        stop.ring = new THREE.Mesh(ring, amber);
        stop.ring.position.set(stop.x, ground + .035, stop.z);
        stop.marker = new THREE.Mesh(diamond, amber);
        stop.marker.position.set(stop.x, ground + 2.15, stop.z);
        markers.add(stop.ring, stop.marker);
      }
      scene.add(markers);
    }
    if (markers) markers.visible = active;
  }

  function reset() {
    for (const stop of stops) {
      stop.visited = false;
      if (!stop.ring) continue;
      stop.ring.material = amber;
      stop.marker.visible = true;
    }
  }

  function update(ctx) {
    const { x, z } = ctx.st.pos;
    let visited = 0, next, distance = Infinity;
    for (const stop of stops) {
      const gap = Math.hypot(x - stop.x, z - stop.z);
      if (!stop.visited && gap < 1.84 && Math.abs(ctx.st.pos.y - stop.ring.position.y) < 1.6) {
        stop.visited = true;
        stop.ring.material = jade;
        stop.marker.visible = false;
        Sound.hit('bell', { m: stop.note, v: .8 });
      }
      if (stop.visited) {
        visited++;
      } else {
        stop.marker.rotation.y = ctx.t * 1.2;
        stop.marker.position.y = stop.ring.position.y + 2.1 + .15 * Math.sin(ctx.t * 2.1);
        if (gap < distance) { next = stop; distance = gap; }
      }
    }
    return { speed: ctx.st.speed, visited, total: stops.length,
      location: next ? `${next.name} · ${Math.round(distance)} 米` : '路线完成' };
  }

  return { setActive, reset, update };
})();
