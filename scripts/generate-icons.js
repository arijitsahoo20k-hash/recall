#!/usr/bin/env node
// Run: node generate-icons.js
// Requires: npm install canvas (or use a service like realfavicongenerator.net)
// This script creates placeholder PNG icons for PWA.
// Draws Recall's mark: a looping arrow forming most of a circle with a
// center dot — the same glyph used in RecallMark.jsx and favicon.svg.

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, 'public', 'icons')

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

sizes.forEach(size => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#FF6B35')
  gradient.addColorStop(1, '#FF8C42')
  ctx.fillStyle = gradient

  // Rounded rect
  const r = size * 0.22
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Recall mark: looping arrow (~290° arc) + arrowhead + center dot
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.27
  const stroke = Math.max(2, size * 0.085)
  const startAngle = (-90 + 18) * (Math.PI / 180)
  const endAngle = startAngle + (290 * Math.PI / 180)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = stroke
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, startAngle, endAngle, false)
  ctx.stroke()

  // Arrowhead at the arc's start, pointing along the tangent
  const tipX = cx + radius * Math.cos(startAngle)
  const tipY = cy + radius * Math.sin(startAngle)
  const tangent = startAngle - Math.PI / 2
  const back = size * 0.16
  const spread = size * 0.075
  const baseCx = tipX - back * Math.cos(tangent)
  const baseCy = tipY - back * Math.sin(tangent)
  const perp = tangent + Math.PI / 2

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(baseCx + spread * Math.cos(perp), baseCy + spread * Math.sin(perp))
  ctx.lineTo(tipX, tipY)
  ctx.lineTo(baseCx - spread * Math.cos(perp), baseCy - spread * Math.sin(perp))
  ctx.closePath()
  ctx.fill()

  // Center dot
  const dotR = size * 0.075
  ctx.beginPath()
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
  ctx.fill()

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(outputDir, `icon-${size}x${size}.png`), buffer)
  console.log(`Generated icon-${size}x${size}.png`)
})
