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
const BG_COLOR = '#94080f'
const TEXT_COLOR = '#fef4b8'

// Where the boat spawns, in UV space (0..1). v is measured from the bottom,
// matching the simulation texture's coordinate space. Left-center start.
const SHIP_UV = { x: 0.12, v: 0.5 }

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

      const fontSize = Math.max(16, Math.floor(resHeight * 0.13))
      ctx.fillStyle = TEXT_COLOR
      ctx.font = `bold ${fontSize}px Geist, system-ui, sans-serif`
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
    const CRUISE = 20 // baseline rightward sailing speed, px/s
    const CRUISE_K = 0.9 // how firmly it holds the cruise speed
    const WAVE_X = 520 // horizontal shove from wave slope
    const WAVE_Y = 260 // vertical nudge from wave slope (kept gentle)
    const CENTER_PULL = 6 // spring keeping the boat near its center line
    const DRAG_Y = 2.6 // vertical water resistance (1/s)
    const HEAVE_GAIN = 26 // crest height → vertical bob, px
    const ROLL_GAIN = 80 // wave slope → tilt, deg
    const SPRING = 90 // stiffness of the heave/roll springs
    const SPRING_DAMP = 11 // how quickly the springs settle
    const WRAP_MARGIN = 90 // sail this far off-edge before reappearing

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

      // Sample the wave field under the boat's current position.
      const uvX = posX / width
      const uvV = 1 - posY / height
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

      // Feed the boat back into the water: it injects a wake scaled by its speed.
      // Convert to the sim's resolution space (x→right, y→bottom-up), like the mouse.
      const speed = Math.hypot(velX, velY)
      simMaterial.uniforms.boat.value.set(posX * dpr, (height - posY) * dpr)
      simMaterial.uniforms.boatStrength.value = Math.min(speed / 120, 1) * 0.5
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
      className="relative w-full h-[50vh] bg-orange-600 select-none overflow-hidden"
      aria-label={TEXT}
    >
      {/* The boat. pointer-events-none keeps the ripple interaction on the
          canvas underneath; its position/rotation is driven via transform. */}
      <img
        ref={shipRef}
        src="/boat.png"
        alt=""
        draggable={false}
        className="pointer-events-none absolute left-0 top-0 w-20 select-none"
        style={{ height: 'auto', transformOrigin: 'center', willChange: 'transform' }}
      />
    </div>
  )
}

export default Elements
