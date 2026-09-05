import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Environment-only detail. No hotspot ids, event handlers or learning records.
const box = (parent, material, size, position) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

export function createMasonryTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 16);
    const joint = y % 16 < 2 || (x + (row % 2) * 16) % 32 < 2;
    const noise = ((x * 17 + y * 31 + x * y) % 19) - 9;
    const value = joint ? 43 : 104 + noise + ((Math.floor(x / 32) * 13 + row * 7) % 20);
    const i = (y * size + x) * 4;
    data[i] = value; data[i + 1] = value * .91; data[i + 2] = value * .82; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const WATER_HARMONICS = [[1,2,.22,.7],[3,1,.13,2.1],[2,-3,.09,4.6],[5,2,.055,1.3],[-2,5,.04,3.7],[7,3,.025,.4],[4,-7,.016,2.6],[9,5,.01,5.1]];

export function createWaterNormalTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    let dx = 0, dy = 0;
    for (const [kx, ky, strength, phase] of WATER_HARMONICS) {
      const wave = Math.cos(kx * u + ky * v + phase) * strength;
      dx += wave * kx * .3; dy += wave * ky * .3;
    }
    const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    const i = (y * size + x) * 4;
    data[i] = (-dx * inverseLength * .5 + .5) * 255; data[i + 1] = (-dy * inverseLength * .5 + .5) * 255;
    data[i + 2] = (inverseLength * .5 + .5) * 255; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Repetition is controlled by world-space UVs in harborWater.js.
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function detailWarehouse(building, materials, width, height, depth, pattern) {
  const front = depth / 2 + .04;
  box(building, materials.stone, [width + .12, .26, depth + .12], [0, .13, 0]);
  for (const side of [-1, 1]) {
    box(building, materials.timber, [.09, height, .1], [side * (width / 2 - .06), height / 2, front]);
  }
  // Match the existing window grid, omitting the door bay.
  const columns = Math.max(2, Math.floor(width / .72));
  const doorX = (pattern % 3 - 1) * width * .19;
  const doorWidth = Math.min(.82, width * .28);
  for (let floor = 0; floor < Math.max(1, Math.floor(height / 1.25)); floor++) {
    const y = .72 + floor * 1.05;
    for (let column = 0; column < columns; column++) {
      const x = -width * .37 + column * width * .74 / Math.max(1, columns - 1);
      if (floor === 0 && Math.abs(x - doorX) < doorWidth * .68) continue;
      for (const side of [-1, 1]) {
        box(building, materials.timber, [.035, .38, .06], [x + side * .145, y, front]);
        box(building, materials.timber, [.33, .035, .06], [x, y + side * .18, front]);
      }
      box(building, materials.timber, [.018, .34, .065], [x, y, front]);
      box(building, materials.timber, [.28, .018, .065], [x, y, front]);
      if ((column + pattern) % 3 === 0) {
        box(building, materials.door, [.11, .36, .045], [x - .23, y, front]);
        box(building, materials.door, [.11, .36, .045], [x + .23, y, front]);
      }
    }
    if (floor > 0) box(building, materials.timber, [width, .07, .07], [0, y - .48, front]);
  }
  // Working waterfront loading hoist, not an additional clue.
  if (pattern % 3 === 0) {
    const beam = box(building, materials.timber, [.1, .1, .95], [0, height - .3, depth / 2 + .38]);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(.1, .024, 5, 12), materials.iron);
    pulley.position.set(beam.position.x, beam.position.y - .14, beam.position.z + .3);
    building.add(pulley);
  }
}

export function detailShip(ship, materials) {
  const stations = [[-3.68,.12,.28],[-3.25,.88,.04],[-2.35,1.4,0],[-.75,1.57,0],[1.25,1.5,.02],[2.75,1.13,.1],[3.5,.42,.34]];
  for (const side of [-1, 1]) {
    for (const y of [.33, .98]) {
      const points = stations.map(([z,w,lift])=>new THREE.Vector3(side*w,y+lift,z));
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.045,5,false),materials.hullTrim);
      rail.castShadow=true;ship.add(rail);
    }
    for (const [z,w,lift] of stations.slice(1,-1)) {
      box(ship,materials.mast,[.045,.38,.045],[side*w,.79+lift,z]);
    }
  }
  const deckShape = new THREE.Shape();
  stations.forEach(([z,w],i)=>i?deckShape.lineTo(-w,-z):deckShape.moveTo(-w,-z));
  [...stations].reverse().forEach(([z,w])=>deckShape.lineTo(w,-z));deckShape.closePath();
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape),materials.deck);
  deck.rotation.x=-Math.PI/2;deck.position.y=.63;deck.receiveShadow=true;ship.add(deck);
  // Raised hatch coaming, deck slats and belaying pins provide readable scale.
  box(ship,materials.hullTrim,[1.12,.14,1.05],[0,.75,-.85]);
  for(let i=0;i<7;i++)box(ship,materials.iron,[.085,.045,.88],[-.42+i*.14,.845,-.85]);
  const capstan = new THREE.Mesh(new THREE.CylinderGeometry(.17,.24,.42,10),materials.mast);
  capstan.position.set(0,.88,1.4);ship.add(capstan);
  for(let i=0;i<3;i++){const bar=box(ship,materials.mast,[.8,.045,.045],[0,1.03,1.4]);bar.rotation.y=i*Math.PI/3;}
  const rig = [];
  for(const mastZ of [-2.15,.25,2.3])for(const side of [-1,1]) {
    for(let line=0;line<4;line++)rig.push(new THREE.Vector3(side*.05,5.7,mastZ),new THREE.Vector3(side*1.42,.9,mastZ-.55+line*.36));
    for(let rung=0;rung<12;rung++) {
      const t=rung/13,y=.98+t*4.6,x=side*(1.42*(1-t)+.05*t);
      rig.push(new THREE.Vector3(x,y,mastZ-.55*(1-t)),new THREE.Vector3(x,y,mastZ+.53*(1-t)));
    }
  }
  ship.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig),materials.rigging));
}

export function dressWaterfront(scene, materials) {
  const dressing = new THREE.Group(); dressing.name = "environment-only-waterfront";
  // Staggered masonry blocks break up the formerly solid quay slab.
  for(let row=0;row<3;row++)for(let i=0;i<36;i++) {
    const x=-21+i*1.2+(row%2)*.6;
    box(dressing,materials.stone,[1.16,.34,.16],[x,-.5+row*.35,-22.22]);
  }
  // Low timber walkways flank, rather than block, the main investigation corridor.
  for(const side of [-1,1]) {
    box(dressing,materials.wetWood,[5.4,.18,2.5],[side*6.8,-.06,-17.9]);
    for(let i=0;i<8;i++)box(dressing,materials.deck,[.56,.055,2.45],[side*6.8-2.1+i*.6,.052,-17.9]);
    for(const x of [side*4.6,side*8.9]) {
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.17,.23,2.5,8),materials.wetWood);
      post.position.set(x,-.75,-16.9);post.castShadow=true;dressing.add(post);
    }
  }
  // Rope-wrapped bollards, nail heads and weathered edge battens on the near wharf.
  for(const x of [-4.05,4.05])for(const z of [2,-2,-6,-10,-14]) {
    box(dressing,materials.wetWood,[.12,.13,3.8],[x,.035,z]);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.21,.032,5,12),materials.rope);
    band.rotation.x=Math.PI/2;band.position.set(x,.34,z-.7);dressing.add(band);
  }
  const nails=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.018,.009,5),materials.iron,336);
  const dummy=new THREE.Object3D();
  for(let i=0;i<336;i++){dummy.position.set([-3.7,-.3,.3,3.7][i%4],-.014,6-Math.floor(i/4)*.28);dummy.updateMatrix();nails.setMatrixAt(i,dummy.matrix);}
  dressing.add(nails);
  scene.add(dressing);
}

// Static opaque meshes only. Interaction proxies and moving water/markers remain intact.
// Bucket by material, shadow behavior and spatial cell to retain useful frustum culling.
export function batchStaticHarbor(scene, excluded = new Set()) {
  scene.updateMatrixWorld(true);
  const batches = new Map(), removed = new Set();
  scene.traverseVisible(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||excluded.has(mesh)||mesh.userData.hotspotId) return;
    if(!mesh.material?.isMeshStandardMaterial||mesh.material.transparent) return;
    const p=new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const key=`${mesh.material.id}:${mesh.castShadow}:${mesh.receiveShadow}:${Math.floor(p.x/12)}:${Math.floor(p.z/12)}`;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  });
  let saved=0;
  for(const meshes of batches.values()) {
    if(meshes.length<2)continue;
    const geometries=meshes.map(mesh=>{
      const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
      if(!g.attributes.normal)g.computeVertexNormals();
      if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      g.applyMatrix4(mesh.matrixWorld);return g;
    });
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!merged)continue;
    const batch=new THREE.Mesh(merged,meshes[0].material);
    batch.name='static-harbor-batch';batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
    merged.computeBoundingSphere();scene.add(batch);
    meshes.forEach(mesh=>{mesh.removeFromParent();removed.add(mesh.geometry)});saved+=meshes.length-1;
  }
  const retained=new Set();scene.traverse(o=>{if(o.geometry)retained.add(o.geometry)});
  removed.forEach(g=>{if(!retained.has(g))g.dispose()});
  return saved;
}
