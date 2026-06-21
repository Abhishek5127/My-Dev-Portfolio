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

const Elements = () => {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
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

    let rafId = 0
    const animate = () => {
      simMaterial.uniforms.frame.value = frame++
      simMaterial.uniforms.time.value = performance.now() / 1000

      // Simulate: read rtA, write rtB.
      simMaterial.uniforms.textureA.value = rtA.texture
      renderer.setRenderTarget(rtB)
      renderer.render(simScene, camera)

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
      className="w-full h-[50vh] bg-orange-600 select-none"
      aria-label={TEXT}
    />
  )
}

export default Elements
