'use client'

import React, { useEffect, useRef } from 'react'

const BLOB_RADIUS_X = 34
const BLOB_RADIUS_Y = 29
const SPRING = 260
const DAMPING = 24
// Stretch controls:
// Raise STRETCHINESS for more pull/stretch, lower it for a calmer droplet.
// Raise MAX_STRETCH if you want the blob to be allowed to deform further.
const STRETCHINESS = 1
const MAX_STRETCH = 0.46
const SQUASHINESS = 0.34

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const BouncyBlob = ({ children, className = '' }) => {
  const shellRef = useRef(null)
  const blobRef = useRef(null)
  const stateRef = useRef({
    active: false,
    dragging: false,
    seeded: false,

    wobble: 0,
    pos: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
  })

  useEffect(() => {
    let rafId = 0
    let lastTime = performance.now()
    const state = stateRef.current

    const animate = (now) => {
      const shell = shellRef.current
      const blob = blobRef.current
      rafId = requestAnimationFrame(animate)

      if (!shell || !blob) return

      const width = shell.clientWidth
      const height = shell.clientHeight
      if (!width || !height) return

      if (!state.seeded) {
        state.pos.x = width / 2
        state.pos.y = height / 2
        state.target.x = width / 2
        state.target.y = height / 2
        state.seeded = true
      }

      const dt = Math.min((now - lastTime) / 1000, 0.034)
      lastTime = now

      const idleTargetX = width / 2
      const idleTargetY = height / 2
      const targetX = state.active ? state.target.x : idleTargetX
      const targetY = state.active ? state.target.y : idleTargetY

      const ax = (targetX - state.pos.x) * SPRING - state.vel.x * DAMPING
      const ay = (targetY - state.pos.y) * SPRING - state.vel.y * DAMPING

      state.vel.x += ax * dt
      state.vel.y += ay * dt
      state.pos.x += state.vel.x * dt
      state.pos.y += state.vel.y * dt

      const minX = BLOB_RADIUS_X
      const maxX = width - BLOB_RADIUS_X
      const minY = BLOB_RADIUS_Y
      const maxY = height - BLOB_RADIUS_Y

      if (state.pos.x < minX) {
        state.pos.x = minX
        state.vel.x = 0
      } else if (state.pos.x > maxX) {
        state.pos.x = maxX
        state.vel.x = 0
      }

      if (state.pos.y < minY) {
        state.pos.y = minY
        state.vel.y = 0
      } else if (state.pos.y > maxY) {
        state.pos.y = maxY
        state.vel.y = 0
      }

      const speed = Math.hypot(state.vel.x, state.vel.y)
      const stretch = Math.min((speed / 760) * STRETCHINESS, MAX_STRETCH)
      const verticalBias = Math.min(Math.abs(state.vel.y) / 520, 0.2)
      const horizontalBias = Math.min(Math.abs(state.vel.x) / 720, 0.22)

      state.wobble += dt * (7 + Math.min(speed / 36, 18))


      const wobble = Math.sin(state.wobble) * Math.min(speed / 950, 0.11)
      const angle = speed > 1 ? Math.atan2(state.vel.y, state.vel.x) : 0
      const scaleX = 1 + stretch + horizontalBias + wobble
      const scaleY = 1 - stretch * SQUASHINESS + verticalBias - wobble * 0.55
      const opacity = state.active || speed > 8 ? 0.48 : 0
      const skew = clamp(state.vel.y / 42, -10, 10)

      blob.style.opacity = `${opacity}`
      blob.style.borderRadius = `${56 + wobble * 60}% ${44 - wobble * 40}% ${50 + horizontalBias * 16}% ${50 - wobble * 55}% / ${42 + verticalBias * 80}% ${58 - horizontalBias * 55}% ${45 + wobble * 45}% ${55 - verticalBias * 20}%`
      blob.style.transform = `translate3d(${state.pos.x}px, ${state.pos.y}px, 0) translate(-50%, -50%) rotate(${angle}rad) skew(${skew}deg) scale(${scaleX}, ${scaleY})`
    }

    rafId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafId)
  }, [])

  const moveTarget = (event) => {
    const shell = shellRef.current
    const state = stateRef.current
    if (!shell) return

    const rect = shell.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    state.active = true
    state.target.x = clamp(x, BLOB_RADIUS_X, rect.width - BLOB_RADIUS_X)
    state.target.y = clamp(y, BLOB_RADIUS_Y, rect.height - BLOB_RADIUS_Y)

    if (!state.seeded) {
      state.pos.x = state.target.x
      state.pos.y = state.target.y
      state.seeded = true
    }
  }

  const handlePointerDown = (event) => {
    stateRef.current.dragging = true
    event.currentTarget.setPointerCapture(event.pointerId)
    moveTarget(event)
  }

  const handlePointerUp = (event) => {
    stateRef.current.dragging = false
    stateRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePointerLeave = () => {
    if (!stateRef.current.dragging) {
      stateRef.current.active = false
    }
  }

  return (
    <div
      ref={shellRef}
      className={['relative overflow-hidden touch-none', className].filter(Boolean).join(' ')}
      onPointerEnter={moveTarget}
      onPointerMove={moveTarget}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={blobRef}
        className="pointer-events-none absolute left-0 top-0 z-0 h-11 w-12 bg-blue-600 opacity-0 blur-[0.3px] transition-opacity duration-150"
        style={{
          boxShadow:
            'inset 7px 9px 14px rgba(255,255,255,0.48), inset -10px -12px 18px rgba(255,255,255,0.16), 0 0 20px rgba(255,255,255,0.26)',
          transform: 'translate3d(-120px, -120px, 0)',
          transformOrigin: 'center',
          willChange: 'transform, opacity, border-radius',
        }}
      >
        <span className="absolute left-3 top-2 h-3 w-2 rounded-full bg-white/70 blur-[1px]" />
      </div>
      {children}
    </div>
  )
}

export default BouncyBlob


