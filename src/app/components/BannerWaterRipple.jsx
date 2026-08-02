"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const WATER_WIDTH_RATIO = 0.347;

const simulationVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const simulationFragmentShader = /* glsl */ `
uniform sampler2D textureA;
uniform vec2 mouse;
uniform vec2 resolution;
uniform int frame;

varying vec2 vUv;

const float delta = 1.4;

void main() {
  vec2 uv = vUv;
  if (frame == 0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec4 data = texture2D(textureA, uv);
  float pressure = data.x;
  float pVel = data.y;

  vec2 texelSize = 1.0 / resolution;
  float pRight = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
  float pLeft = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
  float pUp = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
  float pDown = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;

  if (uv.x <= texelSize.x) pLeft = pRight;
  if (uv.x >= 1.0 - texelSize.x) pRight = pLeft;
  if (uv.y <= texelSize.y) pDown = pUp;
  if (uv.y >= 1.0 - texelSize.y) pUp = pDown;

  pVel += delta * (-2.0 * pressure + pRight + pLeft) / 4.0;
  pVel += delta * (-2.0 * pressure + pUp + pDown) / 4.0;
  pressure += delta * pVel;
  pVel -= 0.005 * delta * pressure;
  pVel *= 1.0 - 0.0016 * delta;
  pressure *= 0.9993;

  vec2 mouseUV = mouse / resolution;
  if (mouse.x > 0.0) {
    float dist = distance(uv, mouseUV);
    if (dist <= 0.025) {
      pressure += 3.0 * (1.0 - dist / 0.025);
    }
  }

  gl_FragColor = vec4(
    pressure,
    pVel,
    (pRight - pLeft) / 2.0,
    (pUp - pDown) / 2.0
  );
}
`;

const renderVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const renderFragmentShader = /* glsl */ `
uniform sampler2D textureA;

varying vec2 vUv;

void main() {
  vec4 data = texture2D(textureA, vUv);
  vec2 distortion = data.zw;

  vec3 baseColor = vec3(0.051, 0.051, 0.051);
  vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
  vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
  float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.45;
  float rippleShade = clamp(data.x * 0.22 + length(distortion) * 1.9, -0.08, 0.18);

  gl_FragColor = vec4(baseColor + rippleShade + specular, 1.0);
}
`;

export default function BannerWaterRipple() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = container.clientWidth;
    let height = container.clientHeight;
    let resWidth = Math.max(1, Math.floor(width * dpr));
    let resHeight = Math.max(1, Math.floor(height * dpr));

    const scene = new THREE.Scene();
    const simScene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2();
    let frame = 0;

    const targetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: false,
    };

    let renderTargetA = new THREE.WebGLRenderTarget(resWidth, resHeight, targetOptions);
    let renderTargetB = new THREE.WebGLRenderTarget(resWidth, resHeight, targetOptions);
    const plane = new THREE.PlaneGeometry(2, 2);

    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        mouse: { value: mouse },
        resolution: { value: new THREE.Vector2(resWidth, resHeight) },
        frame: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    });

    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
    });

    simScene.add(new THREE.Mesh(plane, simMaterial));
    scene.add(new THREE.Mesh(plane, renderMaterial));

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      resWidth = Math.max(1, Math.floor(width * dpr));
      resHeight = Math.max(1, Math.floor(height * dpr));

      renderer.setSize(width, height);
      renderTargetA.setSize(resWidth, resHeight);
      renderTargetB.setSize(resWidth, resHeight);
      simMaterial.uniforms.resolution.value.set(resWidth, resHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = (event.clientX - rect.left) * dpr;
      mouse.y = (rect.height - (event.clientY - rect.top)) * dpr;
    };

    const handlePointerLeave = () => mouse.set(0, 0);

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    let animationFrame = 0;

    const animate = () => {
      simMaterial.uniforms.frame.value = frame++;
      simMaterial.uniforms.textureA.value = renderTargetA.texture;

      renderer.setRenderTarget(renderTargetB);
      renderer.render(simScene, camera);

      renderMaterial.uniforms.textureA.value = renderTargetB.texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      const nextTarget = renderTargetA;
      renderTargetA = renderTargetB;
      renderTargetB = nextTarget;

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderTargetA.dispose();
      renderTargetB.dispose();
      plane.dispose();
      simMaterial.dispose();
      renderMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full cursor-crosshair overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <filter id="banner-water-text-displacement">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.055"
            numOctaves="2"
            seed="7"
          >
            <animate
              attributeName="baseFrequency"
              dur="4s"
              repeatCount="indefinite"
              values="0.018 0.055;0.028 0.075;0.018 0.055"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center justify-center"
        style={{
          width: `${100 / WATER_WIDTH_RATIO}%`,
          filter: "url(#banner-water-text-displacement)",
        }}
      >
        <p className="font-bricolage select-none text-center text-[clamp(2.35rem,6.95vw,8.1rem)] font-black leading-[1.18] tracking-[-0.035em] text-white">
          We Know Our Work Better
          <br />
          than
          <br />
          anybody Else
        </p>
      </div>
    </div>
  );
}
