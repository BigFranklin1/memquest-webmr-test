import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {harborRenderBudget,createHarborWater} from '../src/harborWater.js';

test('touch and low-memory devices receive a conservative water and pixel budget',()=>{
  assert.deepEqual(harborRenderBudget({coarsePointer:true,pixelRatio:3}),{pixelRatio:1.25,segments:[24,20]});
  assert.deepEqual(harborRenderBudget({deviceMemory:4,pixelRatio:2}),{pixelRatio:1.25,segments:[24,20]});
  assert.deepEqual(harborRenderBudget({pixelRatio:2}),{pixelRatio:1.6,segments:[36,28]});
  assert.equal(harborRenderBudget({pixelRatio:1}).pixelRatio,1);
});

test('water is one opaque mesh, borrows textures and avoids shadow passes',()=>{
  const normalTexture=new THREE.Texture(),skyTexture=new THREE.CubeTexture();
  const {mesh}=createHarborWater({normalTexture,skyTexture});
  assert.equal(mesh.geometry.attributes.position.count,525);
  assert.equal(mesh.children.length,0);assert.equal(mesh.material.transparent,false);
  assert.equal(mesh.material.depthWrite,true);assert.equal(mesh.material.fog,true);
  assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
  assert.equal(mesh.material.uniforms.uNormalMap.value,normalTexture);
  assert.equal(mesh.material.uniforms.uSky.value,skyTexture);
  assert.ok(mesh.geometry.boundingBox.min.z<=-.07);
  assert.ok(mesh.geometry.boundingBox.max.z>=.07);
  mesh.geometry.dispose();mesh.material.dispose();normalTexture.dispose();skyTexture.dispose();
});

test('animation changes only time, never uploads vertices or normal buffers',()=>{
  const {mesh,update}=createHarborWater({normalTexture:null,skyTexture:null});
  const positions=mesh.geometry.attributes.position, normals=mesh.geometry.attributes.normal;
  const before=positions.array.slice();const version=positions.version,normalVersion=normals.version;
  update(12.4);assert.equal(mesh.material.uniforms.uTime.value,12.4);
  assert.deepEqual(positions.array,before);assert.equal(positions.version,version);
  assert.equal(normals.version,normalVersion);
  update(0);assert.equal(mesh.material.uniforms.uTime.value,0);
  mesh.geometry.dispose();mesh.material.dispose();
});
