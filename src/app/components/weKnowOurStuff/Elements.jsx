'use client'

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  simulationVertexShader,
  simulationFragmentShader,
  renderVertexShader,
  renderFragmentShader,
} from './Shaders'

const TEXT = 'We Know Our Stuff Better Than Anybody!!'
const BG_COLOR = '#0a0a0a'
const TEXT_COLOR = '#fef4b8'
// Font size as a fraction of the banner height (0.13 = ~13% of height).
// Bump this up for bigger text, down for smaller.
const Text_SIZE = 0.12;

// --- Font (easy to change) ---
// FONT_CSS_VAR points at a font loaded in layout.tsx via next/font (the var
// resolves to the real hashed family name at runtime). FONT_FALLBACK is used
// until the webfont is ready / if the var is missing. To switch fonts, load a
// new one in layout.tsx and point FONT_CSS_VAR at its variable.
const FONT_WEIGHT = 'bold'
const FONT_CSS_VAR = '--font-poppins'
const FONT_FALLBACK = 'Poppins, system-ui, sans-serif'

// Where the boat spawns, in UV space (0..1). v is measured from the bottom,
// matching the simulation texture's coordinate space. Left-center start.
const SHIP_UV = { x: 0.12, v: 0.5 }

// --- Boat size (easy to change) ---
// BOAT_SIZE is the rendered width of the boat in px (height scales to keep its
// aspect ratio). The wake offsets are expressed as fractions of this, so the
// collision physics scales WITH the boat — bump BOAT_SIZE and the stern wake /
// bow sampling follow automatically.
const BOAT_SIZE = 96 // px
const STERN_FACTOR = 0.27 // wake born this far behind the boat center, × BOAT_SIZE
const BOW_FACTOR = 0.23 // water read this far ahead of the boat center, × BOAT_SIZE

const Elements = () => {
  const containerRef = useRef(null)
  const shipRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const ship = shipRef.current
    if (!container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = container.clientWidth
    let height = container.clientHeight
    // Buffer resolution (device pixels) used by the simulation.
    let resWidth = Math.max(1, Math.floor(width * dpr))
    let resHeight = Math.max(1, Math.floor(height * dpr))

    const scene = new THREE.Scene()
    const simScene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    container.appendChild(renderer.domElement)

    const mouse = new THREE.Vector2()
    let frame = 0

    // HalfFloat is widely renderable + linearly filterable on WebGL2.
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
        boat: { value: new THREE.Vector2() },
        boatStrength: { value: 0 },
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

    // 2D canvas holding the text that the ripple distorts.
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { alpha: true })
    const textTexture = new THREE.CanvasTexture(canvas)
    textTexture.minFilter = THREE.LinearFilter
    textTexture.magFilter = THREE.LinearFilter
    textTexture.format = THREE.RGBAFormat

    const wrapLines = (text, maxWidth) => {
      const words = text.split(' ')
      const lines = []
      let current = ''
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current)
          current = word
        } else {
          current = test
        }
      }
      if (current) lines.push(current)
      return lines
    }

    const drawText = () => {
      canvas.width = resWidth
      canvas.height = resHeight

      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, resWidth, resHeight)

      const fontSize = Math.max(16, Math.floor(resHeight * Text_SIZE))
      // Resolve the next/font CSS variable to its real family name (canvas
      // can't parse var()); fall back until the webfont has loaded.
      const cssFamily = getComputedStyle(document.documentElement)
        .getPropertyValue(FONT_CSS_VAR)
        .trim()
      const fontFamily = cssFamily || FONT_FALLBACK
      ctx.fillStyle = TEXT_COLOR
      ctx.font = `${FONT_WEIGHT} ${fontSize}px ${fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const lines = wrapLines(TEXT, resWidth * 0.9)
      const lineHeight = fontSize * 1.15
      const startY = resHeight / 2 - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, resWidth / 2, startY + i * lineHeight)
      })

      textTexture.needsUpdate = true
    }

    drawText()

    // Canvas may paint before Poppins is ready; redraw once it loads so we
    // don't get stuck on the fallback font.
    if (document.fonts?.ready) {
      document.fonts.ready.then(drawText)
    }

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
      positionShip()
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left) * dpr
      mouse.y = (rect.height - (e.clientY - rect.top)) * dpr
    }
    const handleMouseLeave = () => {
      mouse.set(0, 0)
    }
    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave)

    // --- Boat: a small CPU buoyancy sim driven by the GPU wave field ---
    // The sim render target packs: r = wave height, b/a = in-plane slope (x/y).
    // The boat sails rightward at a cruising speed; wave slopes shove it around
    // horizontally, momentum carries it, and it wraps back to the left edge.
    const pixelBuffer = new Uint16Array(4) // HalfFloat target → 16-bit per channel
    let canSampleWaves = true // disabled if GPU readback isn't supported

    // Physics state — absolute position in the banner (px) and velocities.
    let posX = SHIP_UV.x * width // spawn at left-center
    let posY = (1 - SHIP_UV.v) * height
    let velX = 0, velY = 0 // px/s
    let heave = 0, heaveV = 0 // vertical bob, px (spring)
    let roll = 0, rollV = 0 // tilt, deg (spring)

    // Tunables.
    const CRUISE = 40 // baseline rightward sailing speed, px/s
    const CRUISE_K = 0.9 // how firmly it holds the cruise speed
    const WAVE_X = 520 // horizontal shove from wave slope
    const WAVE_Y = 260 // vertical nudge from wave slope (kept gentle)
    const CENTER_PULL = 0.5 // spring keeping the boat near its center line
    const DRAG_Y = 2.6 // vertical water resistance (1/s)
    const HEAVE_GAIN = 26 // crest height → vertical bob, px
    const ROLL_GAIN = 60 // wave slope → tilt, deg
    const SPRING = 20 // stiffness of the heave/roll springs
    const SPRING_DAMP = 11 // how quickly the springs settle
    const WRAP_MARGIN = 10 // sail this far off-edge before reappearing
    // Wake: the boat stamps a stronger, longer-lived trail from its stern, and
    // reads the water from its bow — so that trail spreads out behind/around it
    // without shoving the boat back. This is what keeps self-impact low.
    const WAKE_GAIN = 0.5 // wake strength at full speed (was a faint 0.5)
    const WAKE_SPEED_REF = 40 // speed (px/s) at which the wake reaches full strength
    const STERN_OFFSET = BOAT_SIZE * STERN_FACTOR // px behind the boat where the wake is born
    const BOW_OFFSET = BOAT_SIZE * BOW_FACTOR // px ahead of the boat where it reads the water

    // Initial momentum: already moving right when it spawns.
    velX = CRUISE

    const positionShip = () => {
      if (!ship) return
      // Absolute position is driven entirely via transform; pin the box to 0,0.
      ship.style.left = '0px'
      ship.style.top = '0px'
    }
    positionShip()

    const updateShip = (dt) => {
      if (!ship || !canSampleWaves || dt <= 0) return

      // Read the water a little AHEAD of the boat (at the bow), in cleaner
      // water. This lets the boat ride genuine waves while largely ignoring its
      // own wake, which is laid down behind it at the stern.
      const sampleSpeed = Math.hypot(velX, velY)
      const headX = sampleSpeed > 1e-3 ? velX / sampleSpeed : 1
      const headY = sampleSpeed > 1e-3 ? velY / sampleSpeed : 0
      const uvX = (posX + headX * BOW_OFFSET) / width
      const uvV = 1 - (posY + headY * BOW_OFFSET) / height
      const px = Math.min(resWidth - 1, Math.max(0, Math.floor(uvX * resWidth)))
      const py = Math.min(resHeight - 1, Math.max(0, Math.floor(uvV * resHeight)))

      try {
        // rtB holds the freshest simulation (read before the ping-pong swap).
        renderer.readRenderTargetPixels(rtB, px, py, 1, 1, pixelBuffer)
      } catch {
        canSampleWaves = false // some GPUs can't read float targets — fail gracefully
        return
      }

      const waveHeight = THREE.DataUtils.fromHalfFloat(pixelBuffer[0]) // wave height
      const slopeX = THREE.DataUtils.fromHalfFloat(pixelBuffer[2]) // x gradient
      const slopeY = THREE.DataUtils.fromHalfFloat(pixelBuffer[3]) // y gradient (sim v)

      const homeY = (1 - SHIP_UV.v) * height

      // Horizontal: hold the cruise speed, but let wave slopes shove it around.
      const ax = (CRUISE - velX) * CRUISE_K - WAVE_X * slopeX
      // Vertical: spring back to the center line + gentle wave nudge + drag.
      const ay = (homeY - posY) * CENTER_PULL + WAVE_Y * slopeY - DRAG_Y * velY
      velX += ax * dt
      velY += ay * dt
      posX += velX * dt
      posY += velY * dt

      // Wrap horizontally so the boat keeps sailing across forever.
      if (posX > width + WRAP_MARGIN) posX = -WRAP_MARGIN
      else if (posX < -WRAP_MARGIN) posX = width + WRAP_MARGIN

      // Keep it vertically on-screen.
      const maxOff = height * 0.4
      posY = THREE.MathUtils.clamp(posY, homeY - maxOff, homeY + maxOff)

      // --- Heave (bob) and roll (tilt): critically-damped springs, so the boat
      // eases toward the surface instead of snapping to it. ---
      const targetHeave = THREE.MathUtils.clamp(waveHeight, -1, 1) * HEAVE_GAIN
      heaveV += (SPRING * (targetHeave - heave) - SPRING_DAMP * heaveV) * dt
      heave += heaveV * dt

      const targetRoll = THREE.MathUtils.clamp(slopeX, -0.6, 0.6) * ROLL_GAIN
      rollV += (SPRING * (targetRoll - roll) - SPRING_DAMP * rollV) * dt
      roll += rollV * dt

      // Crest (positive height) lifts the boat → negative CSS Y.
      // BASE_TILT is a fixed -30° (anticlockwise) heading on top of the wave roll.
      const BASE_TILT = -30
      ship.style.transform =
        `translate(${posX}px, ${posY - heave}px) translate(-50%, -50%) rotate(${roll + BASE_TILT}deg)`

      // Feed the boat back into the water: lay a strong wake from the STERN, so
      // the trail streams out behind the boat — and spreads on all sides as the
      // wave sim propagates it — instead of pushing the boat forward. Convert to
      // the sim's resolution space (x→right, y→bottom-up), like the mouse.
      const speed = Math.hypot(velX, velY)
      const wakeHeadX = speed > 1e-3 ? velX / speed : 1
      const wakeHeadY = speed > 1e-3 ? velY / speed : 0
      const wakeX = posX - wakeHeadX * STERN_OFFSET
      const wakeY = posY - wakeHeadY * STERN_OFFSET
      simMaterial.uniforms.boat.value.set(wakeX * dpr, (height - wakeY) * dpr)
      simMaterial.uniforms.boatStrength.value = Math.min(speed / WAKE_SPEED_REF, 1) * WAKE_GAIN
    }

    let rafId = 0
    let lastTime = performance.now()
    const animate = () => {
      const now = performance.now()
      // Clamp dt so a backgrounded tab doesn't blow up the integrator on return.
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      simMaterial.uniforms.frame.value = frame++
      simMaterial.uniforms.time.value = now / 1000

      // Simulate: read rtA, write rtB.
      simMaterial.uniforms.textureA.value = rtA.texture
      renderer.setRenderTarget(rtB)
      renderer.render(simScene, camera)

      // Sample the fresh wave state under the ship before the swap.
      updateShip(dt)

      // Render: distort the text with the fresh simulation.
      renderMaterial.uniforms.textureA.value = rtB.texture
      renderMaterial.uniforms.textureB.value = textTexture
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)

      // Ping-pong swap.
      const temp = rtA
      rtA = rtB
      rtB = temp

      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave)
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      rtA.dispose()
      rtB.dispose()
      plane.dispose()
      simMaterial.dispose()
      renderMaterial.dispose()
      textTexture.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100vh] cursor-crosshair select-none overflow-hidden"
      aria-label={TEXT}
    >
      {/* The boat. pointer-events-none keeps the ripple interaction on the
          canvas underneath; its position/rotation is driven via transform. */}
      <img
        ref={shipRef}
        src="/boat.png"
        alt=""
        draggable={false}
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{ width: BOAT_SIZE, height: 'auto', transformOrigin: 'center', willChange: 'transform' }}
      />
    </div>
  )
}

export default Elements
