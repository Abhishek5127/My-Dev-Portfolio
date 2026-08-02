'use client'

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── Simulation shader — identical physics to weKnowOurStuff/Elements.jsx ─────
const simulationVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const simulationFragmentShader = /* glsl */`
uniform sampler2D textureA;
uniform vec2      mouse;
uniform vec2      resolution;
uniform float     time;
uniform int       frame;

varying vec2 vUv;

const float delta = 1.4;

void main() {
  vec2 uv = vUv;
  if (frame == 0) { gl_FragColor = vec4(0.0); return; }

  vec4  data     = texture2D(textureA, uv);
  float pressure = data.x;
  float pVel     = data.y;

  vec2 texelSize = 1.0 / resolution;
  float p_right = texture2D(textureA, uv + vec2( texelSize.x, 0.0)).x;
  float p_left  = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
  float p_up    = texture2D(textureA, uv + vec2(0.0,  texelSize.y)).x;
  float p_down  = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;

  if (uv.x <= texelSize.x)           p_left  = p_right;
  if (uv.x >= 1.0 - texelSize.x)     p_right = p_left;
  if (uv.y <= texelSize.y)           p_down  = p_up;
  if (uv.y >= 1.0 - texelSize.y)     p_up    = p_down;

  pVel     += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
  pVel     += delta * (-2.0 * pressure + p_up    + p_down) / 4.0;
  pressure += delta * pVel;
  pVel     -= 0.005 * delta * pressure;
  pVel     *= 1.0 - 0.0016 * delta;
  pressure *= 0.9993;

  vec2 mouseUV = mouse / resolution;
  if (mouse.x > 0.0) {
    float dist = distance(uv, mouseUV);
    if (dist <= 0.02) pressure += 3.0 * (1.0 - dist / 0.02);
  }

  gl_FragColor = vec4(
    pressure,
    pVel,
    (p_right - p_left) / 2.0,
    (p_up    - p_down) / 2.0
  );
}
`

// ── Render shader — pure water surface, no text texture ──────────────────────
const renderVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const renderFragmentShader = /* glsl */`
uniform sampler2D textureA;

varying vec2 vUv;

void main() {
  vec4 data = texture2D(textureA, vUv);

  vec3  normal   = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
  vec3  lightDir = normalize(vec3(-3.0, 10.0, 3.0));
  float NdotL    = max(0.0, dot(normal, lightDir));

  // #0d0d0d base
  vec3 waterColor = vec3(0.051);
  float height    = data.x;
  float specular  = pow(NdotL, 60.0) * 1.5;

  gl_FragColor = vec4(waterColor + vec3(specular) + height * 0.04, 1.0);
}
`

export default function BannerWaterRipple() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width     = container.clientWidth
    let height    = container.clientHeight
    let resWidth  = Math.max(1, Math.floor(width  * dpr))
    let resHeight = Math.max(1, Math.floor(height * dpr))

    const scene    = new THREE.Scene()
    const simScene = new THREE.Scene()
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width   = '100%'
    renderer.domElement.style.height  = '100%'
    container.appendChild(renderer.domElement)

    const mouse = new THREE.Vector2()
    let frame   = 0

    const rtOptions = {
      format: THREE.RGBAFormat,
      type:   THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer:   false,
    }

    let rtA = new THREE.WebGLRenderTarget(resWidth, resHeight, rtOptions)
    let rtB = new THREE.WebGLRenderTarget(resWidth, resHeight, rtOptions)

    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA:   { value: null },
        mouse:      { value: mouse },
        resolution: { value: new THREE.Vector2(resWidth, resHeight) },
        time:       { value: 0 },
        frame:      { value: 0 },
      },
      vertexShader:   simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    })

    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: { textureA: { value: null } },
      vertexShader:   renderVertexShader,
      fragmentShader: renderFragmentShader,
    })

    const plane      = new THREE.PlaneGeometry(2, 2)
    const simQuad    = new THREE.Mesh(plane, simMaterial)
    const renderQuad = new THREE.Mesh(plane, renderMaterial)
    simScene.add(simQuad)
    scene.add(renderQuad)

    const handleResize = () => {
      width     = container.clientWidth
      height    = container.clientHeight
      resWidth  = Math.max(1, Math.floor(width  * dpr))
      resHeight = Math.max(1, Math.floor(height * dpr))
      renderer.setSize(width, height)
      rtA.setSize(resWidth, resHeight)
      rtB.setSize(resWidth, resHeight)
      simMaterial.uniforms.resolution.value.set(resWidth, resHeight)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left)  * dpr
      mouse.y = (rect.height - (e.clientY - rect.top)) * dpr
    }
    const handleMouseLeave = () => mouse.set(0, 0)
    renderer.domElement.addEventListener('mousemove',  handleMouseMove)
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave)

    let rafId    = 0
    let lastTime = performance.now()
    const animate = () => {
      const now = performance.now()
      lastTime  = now

      simMaterial.uniforms.frame.value = frame++
      simMaterial.uniforms.time.value  = now / 1000

      simMaterial.uniforms.textureA.value = rtA.texture
      renderer.setRenderTarget(rtB)
      renderer.render(simScene, camera)

      renderMaterial.uniforms.textureA.value = rtB.texture
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)

      const temp = rtA; rtA = rtB; rtB = temp
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('mousemove',  handleMouseMove)
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave)
      if (renderer.domElement.parentNode === container)
        container.removeChild(renderer.domElement)
      rtA.dispose(); rtB.dispose()
      plane.dispose(); simMaterial.dispose(); renderMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair select-none overflow-hidden"
    />
  )
}
