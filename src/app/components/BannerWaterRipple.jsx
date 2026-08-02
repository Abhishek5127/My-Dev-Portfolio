'use client'

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Text config ─────────────────────────────────────────────────────────────
// The text is drawn as if it's centered on the FULL banner width (3 columns).
// This canvas covers column 1 only, so only the leftmost slice of the centered
// text appears here — and that slice gets wave-distorted by the GPU simulation.
const TEXT_LINES = ['We Know Our Work Better', 'than', 'anybody Else']
const BG_COLOR = '#0d0d0d'
const TEXT_COLOR = '#ffffff'
// Fraction of canvas height → matches CSS clamp(1.8rem, 7.5vw, 5.5rem)
const TEXT_SIZE = 0.18
const FONT_WEIGHT = '900'
const FONT_CSS_VAR = '--font-bricolage'
const FONT_FALLBACK = 'Bricolage Grotesque, system-ui, sans-serif'

// This canvas is 1/SECTION_COUNT of the full banner.
// Drawing text at x = resWidth * (SECTION_COUNT / 2) centers it on the full banner.
const SECTION_COUNT = 3
// ─────────────────────────────────────────────────────────────────────────────

// ── Simulation shader — same physics as weKnowOurStuff/Elements.jsx ──────────
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

// ── Render shader — distorts textureB (text canvas) with wave data ────────────
const renderVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const renderFragmentShader = /* glsl */`
uniform sampler2D textureA;  // wave simulation
uniform sampler2D textureB;  // text canvas

varying vec2 vUv;

void main() {
  vec4  data       = texture2D(textureA, vUv);
  vec2  distortion = 0.3 * data.zw;
  vec4  color      = texture2D(textureB, vUv + distortion);

  vec3  normal   = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
  vec3  lightDir = normalize(vec3(-3.0, 10.0, 3.0));
  float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;

  gl_FragColor = color + vec4(specular);
}
`

export default function BannerWaterRipple() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = container.clientWidth
    let height = container.clientHeight
    let resWidth = Math.max(1, Math.floor(width * dpr))
    let resHeight = Math.max(1, Math.floor(height * dpr))

    const scene = new THREE.Scene()
    const simScene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    container.appendChild(renderer.domElement)

    const mouse = new THREE.Vector2()
    let frame = 0

    const rtOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: false,
    }

    let rtA = new THREE.WebGLRenderTarget(resWidth, resHeight, rtOptions)
    let rtB = new THREE.WebGLRenderTarget(resWidth, resHeight, rtOptions)

    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        mouse: { value: mouse },
        resolution: { value: new THREE.Vector2(resWidth, resHeight) },
        time: { value: 0 },
        frame: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    })

    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        textureB: { value: null },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
    })

    const plane = new THREE.PlaneGeometry(2, 2)
    const simQuad = new THREE.Mesh(plane, simMaterial)
    const renderQuad = new THREE.Mesh(plane, renderMaterial)
    simScene.add(simQuad)
    scene.add(renderQuad)

    // ── Text canvas ──────────────────────────────────────────────────────────
    // Draw text as if centered on the FULL banner width.
    // textCenterX = fullBannerWidth / 2, measured from the left edge of this
    // canvas (section 1), so textCenterX = resWidth * SECTION_COUNT / 2.
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { alpha: true })
    const textTexture = new THREE.CanvasTexture(canvas)
    textTexture.minFilter = THREE.LinearFilter
    textTexture.magFilter = THREE.LinearFilter
    textTexture.format = THREE.RGBAFormat

    const drawText = () => {
      canvas.width = resWidth
      canvas.height = resHeight

      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, resWidth, resHeight)

      const fontSize = Math.max(14, Math.floor(resHeight * TEXT_SIZE))
      const cssFamily = getComputedStyle(document.documentElement).getPropertyValue(FONT_CSS_VAR).trim()
      const fontFamily = cssFamily || FONT_FALLBACK

      ctx.fillStyle = TEXT_COLOR
      ctx.font = `${FONT_WEIGHT} ${fontSize}px ${fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Center X on the full banner; this canvas shows only the section 1 slice.
      const textCenterX = resWidth * (SECTION_COUNT / 2)  // = resWidth * 1.5
      const lineHeight = fontSize * 1.18
      const startY = resHeight / 2 - ((TEXT_LINES.length - 1) * lineHeight) / 2

      TEXT_LINES.forEach((line, i) => {
        ctx.fillText(line, textCenterX, startY + i * lineHeight)
      })

      textTexture.needsUpdate = true
    }

    drawText()
    if (document.fonts?.ready) document.fonts.ready.then(drawText)

    // ── Resize ───────────────────────────────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth
      height = container.clientHeight
      resWidth = Math.max(1, Math.floor(width * dpr))
      resHeight = Math.max(1, Math.floor(height * dpr))
      renderer.setSize(width, height)
      rtA.setSize(resWidth, resHeight)
      rtB.setSize(resWidth, resHeight)
      simMaterial.uniforms.resolution.value.set(resWidth, resHeight)
      drawText()
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // ── Mouse ────────────────────────────────────────────────────────────────
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left) * dpr
      mouse.y = (rect.height - (e.clientY - rect.top)) * dpr
    }
    const handleMouseLeave = () => mouse.set(0, 0)
    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave)

    // ── Render loop ──────────────────────────────────────────────────────────
    let rafId = 0
    let lastTime = performance.now()
    const animate = () => {
      const now = performance.now()
      lastTime = now

      simMaterial.uniforms.frame.value = frame++
      simMaterial.uniforms.time.value = now / 1000

      simMaterial.uniforms.textureA.value = rtA.texture
      renderer.setRenderTarget(rtB)
      renderer.render(simScene, camera)

      renderMaterial.uniforms.textureA.value = rtB.texture
      renderMaterial.uniforms.textureB.value = textTexture
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)

      const temp = rtA; rtA = rtB; rtB = temp
      rafId = requestAnimationFrame(animate)
    }
    animate()

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave)
      if (renderer.domElement.parentNode === container)
        container.removeChild(renderer.domElement)
      rtA.dispose(); rtB.dispose()
      plane.dispose(); simMaterial.dispose(); renderMaterial.dispose()
      textTexture.dispose(); renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair select-none overflow-hidden"
    />
  )
}
