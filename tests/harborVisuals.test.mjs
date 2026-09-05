import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticHarbor, createMasonryTexture, createWaterNormalTexture, detailShip, detailWarehouse, dressWaterfront} from '../src/harborVisuals.js';

test('static batching preserves world bounds and leaves hit proxies, water and instances untouched',()=>{
  const scene=new THREE.Scene(),mat=new THREE.MeshStandardMaterial();
  const parent=new THREE.Group();parent.position.set(3,1,-2);parent.rotation.y=.4;scene.add(parent);
  const geometry=new THREE.BoxGeometry(1,1,1);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(geometry,mat);m.position.x=i;parent.add(m)}
  const before=new THREE.Box3().setFromObject(parent);
  const water=new THREE.Mesh(geometry,mat);water.position.set(0,-1,0);scene.add(water);
  const proxy=new THREE.Mesh(geometry,mat);proxy.userData.hotspotId='tea-chest';scene.add(proxy);
  const instance=new THREE.InstancedMesh(geometry,mat,1);scene.add(instance);
  assert.equal(batchStaticHarbor(scene,new Set([water])),2);
  assert.equal(water.parent,scene);assert.equal(proxy.parent,scene);assert.equal(instance.parent,scene);
  const batch=scene.children.find(o=>o.name==='static-harbor-batch');
  const after=new THREE.Box3().setFromObject(batch);
  assert.ok(before.min.distanceTo(after.min)<1e-6);assert.ok(before.max.distanceTo(after.max)<1e-6);
  assert.ok([...batch.geometry.attributes.position.array].every(Number.isFinite));
});

test('procedural detail textures are repeatable and water normals remain linear',()=>{
  const a=createMasonryTexture(),b=createMasonryTexture(),normal=createWaterNormalTexture();
  assert.deepEqual(a.image.data,b.image.data);assert.equal(a.colorSpace,THREE.SRGBColorSpace);
  assert.equal(normal.colorSpace,THREE.NoColorSpace);assert.equal(normal.wrapS,THREE.RepeatWrapping);
  for(let i=3;i<normal.image.data.length;i+=4)assert.equal(normal.image.data[i],255);
  a.dispose();b.dispose();normal.dispose();
});

test('added environment details do not introduce interactive learning targets',()=>{
  const material=new THREE.MeshStandardMaterial();
  const materials=new Proxy({}, {get:()=>material});const scene=new THREE.Scene();
  const ship=new THREE.Group(),building=new THREE.Group();scene.add(ship,building);
  detailShip(ship,materials);detailWarehouse(building,materials,3.2,4,3,0);dressWaterfront(scene,materials);
  let meshCount=0;scene.traverse(o=>{assert.equal(o.userData.hotspotId,undefined);if(o.isMesh)meshCount++});
  assert.ok(meshCount>100);assert.ok(scene.getObjectByName('environment-only-waterfront'));
});
