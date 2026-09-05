import * as THREE from "three";

// Conservative mobile budgets, independent of device brand or user-agent strings.
export function harborRenderBudget({ coarsePointer = false, deviceMemory = 8, pixelRatio = 1 } = {}) {
  const mobileBudget = coarsePointer || deviceMemory <= 4;
  return {
    pixelRatio: Math.min(pixelRatio, mobileBudget ? 1.25 : 1.6),
    segments: mobileBudget ? [24, 20] : [36, 28],
  };
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWaterPosition;
  varying vec3 vWaterNormal;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    float a = dot(p.xy, vec2(0.38, 0.21)) + uTime * 0.35;
    float b = dot(p.xy, vec2(-0.19, 0.52)) - uTime * 0.27;
    p.z += sin(a) * 0.045 + sin(b) * 0.025;
    // Analytic slope: no CPU vertex updates or per-frame normal-buffer uploads.
    vec2 slope = cos(a) * vec2(0.0171, 0.00945)
               + cos(b) * vec2(-0.00475, 0.013);
    vWaterNormal = normalize(mat3(modelMatrix) * vec3(-slope, 1.0));
    vec4 worldPosition = modelMatrix * vec4(p, 1.0);
    vWaterPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNormalMap;
  uniform samplerCube uSky;
  uniform vec3 uDeepColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uMoonColor;
  uniform vec3 uLampColor;
  varying vec3 vWaterPosition;
  varying vec3 vWaterNormal;
  #include <fog_pars_fragment>
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWaterPosition);
    float distanceToEye = length(cameraPosition - vWaterPosition);
    vec2 uv = vWaterPosition.xz;
    vec2 drift = vec2(uTime * 0.009, uTime * -0.006);
    vec2 n1 = texture2D(uNormalMap, uv * 0.17 + drift).xy * 2.0 - 1.0;
    vec2 n2 = texture2D(uNormalMap,
      mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.11 - drift * 0.7).xy * 2.0 - 1.0;
    vec2 ripple = n1 * 0.65 + n2 * 0.35;
    // Mipmapped lookup + distance attenuation suppress distant moire on small screens.
    float nearDetail = 1.0 - smoothstep(7.0, 38.0, distanceToEye);
    vec3 normal = normalize(vWaterNormal + vec3(ripple.x, 0.0, -ripple.y) * (0.09 + nearDetail * 0.15));
    float facing = clamp(dot(viewDirection, normal), 0.0, 1.0);
    float fresnel = 0.12 + 0.65 * pow(1.0 - facing, 4.0);
    vec3 reflectedDirection = reflect(-viewDirection, normal);
    vec3 sky = textureCube(uSky, reflectedDirection).rgb;
    vec3 reflection = mix(uHorizonColor, sky, 0.55);
    vec3 color = mix(uDeepColor, reflection, fresnel);
    // Soft slope shading keeps ripples legible even where the night sky is uniform.
    float rippleLight = smoothstep(-0.2, 0.2, ripple.x * 0.7 + ripple.y * 0.4);
    color *= mix(1.0, 0.72 + rippleLight * 0.48, nearDetail);
    vec3 moonDirection = normalize(vec3(-8.0, 12.0, -6.0));
    float moon = pow(max(dot(reflect(-moonDirection, normal), viewDirection), 0.0), 70.0);
    color += uMoonColor * moon * 0.26;
    // Restrained broken warm glints below the two existing quay lamps.
    float lampColumns = pow(max(0.0, 1.0 - abs(uv.x + 8.0) * 0.65), 3.0)
                      + pow(max(0.0, 1.0 - abs(uv.x - 9.0) * 0.65), 3.0);
    float harborBand = smoothstep(-23.0, -19.0, uv.y) * (1.0 - smoothstep(-12.0, -5.0, uv.y));
    float glints = smoothstep(-0.03, 0.2, ripple.x + ripple.y * 0.25);
    color += uLampColor * lampColumns * harborBand * glints * 0.1;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createHarborWater({ normalTexture, skyTexture, segments = [24, 20] }) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x183744) },
      uHorizonColor: { value: new THREE.Color(0x415665) },
      uMoonColor: { value: new THREE.Color(0xb1c6d1) },
      uLampColor: { value: new THREE.Color(0xe9b069) },
    },
  ]);
  // Set borrowed textures after cloning uniforms so ownership stays with the scene.
  uniforms.uNormalMap = { value: normalTexture };
  uniforms.uSky = { value: skyTexture };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, fog: true,
    transparent: false, depthWrite: true, lights: false,
  });
  const geometry = new THREE.PlaneGeometry(70, 65, ...segments);
  // GPU displacement stays within 0.07m, including in both XR eye views.
  geometry.computeBoundingBox();
  geometry.boundingBox.min.z = -0.075;
  geometry.boundingBox.max.z = 0.075;
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius += 0.075;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "single-pass-harbor-water";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.5, -19);
  // No shadow pass, screen-space reflection, refraction target, or transparent layers.
  return { mesh, update(time) { uniforms.uTime.value = time; } };
}
