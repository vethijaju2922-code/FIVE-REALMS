import * as THREE from 'three';
import { WorldId } from '../../types/game';

export interface WorldTextureSet {
  trackMap: THREE.CanvasTexture;
  pillarMap: THREE.CanvasTexture;
  terrainMap: THREE.CanvasTexture;
}

const textureCache = new Map<string, WorldTextureSet>();
let contactShadowTex: THREE.CanvasTexture | null = null;
let particleGlowTex: THREE.CanvasTexture | null = null;

function configureTexture(
  tex: THREE.CanvasTexture,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (contactShadowTex) return contactShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  contactShadowTex = new THREE.CanvasTexture(canvas);
  contactShadowTex.colorSpace = THREE.SRGBColorSpace;
  return contactShadowTex;
}

export function getParticleGlowTexture(): THREE.CanvasTexture {
  if (particleGlowTex) return particleGlowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  particleGlowTex = new THREE.CanvasTexture(canvas);
  particleGlowTex.colorSpace = THREE.SRGBColorSpace;
  return particleGlowTex;
}

function drawStoneTrack(
  ctx: CanvasRenderingContext2D,
  base: string,
  grout: string,
  accent: string,
  glowLines = false
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Stone flagstones across 3 lanes
  const cols = 6;
  const rows = 8;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = ((r * 7 + c * 13) % 5) * 6 - 12;
      ctx.fillStyle = base;
      ctx.fillRect(c * w + 3, r * h + 3, w - 6, h - 6);
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade / 255})` : `rgba(0,0,0,${-shade / 255})`;
      ctx.fillRect(c * w + 3, r * h + 3, w - 6, h - 6);

      ctx.strokeStyle = grout;
      ctx.lineWidth = 4;
      ctx.strokeRect(c * w + 2, r * h + 2, w - 4, h - 4);
    }
  }

  // Lane divider carvings
  ctx.strokeStyle = accent;
  ctx.lineWidth = glowLines ? 6 : 4;
  [170, 342].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  });

  // Speckles / moss / sand / frost grain
  for (let i = 0; i < 450; i++) {
    const x = (i * 97) % 512;
    const y = (i * 53) % 512;
    ctx.fillStyle = i % 3 === 0 ? accent : 'rgba(0,0,0,0.12)';
    ctx.globalAlpha = glowLines ? 0.35 : 0.2;
    ctx.fillRect(x, y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export function getWorldTextures(worldId: WorldId, maxAnisotropy: number): WorldTextureSet {
  const key = `${worldId}_${Math.min(8, maxAnisotropy)}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const trackCanvas = document.createElement('canvas');
  trackCanvas.width = 512;
  trackCanvas.height = 512;
  const tCtx = trackCanvas.getContext('2d')!;

  const pillarCanvas = document.createElement('canvas');
  pillarCanvas.width = 256;
  pillarCanvas.height = 256;
  const pCtx = pillarCanvas.getContext('2d')!;

  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = 256;
  terrainCanvas.height = 256;
  const gCtx = terrainCanvas.getContext('2d')!;

  if (worldId === 'jungle') {
    drawStoneTrack(tCtx, '#565c4b', '#2c3325', '#3d7042');
    pCtx.fillStyle = '#4e5442';
    pCtx.fillRect(0, 0, 256, 256);
    pCtx.fillStyle = '#2f5e36';
    for (let y = 0; y < 256; y += 32) {
      pCtx.fillRect(0, y, 256, 4);
      pCtx.fillRect((y * 3) % 200, y + 6, 42, 10);
    }
    gCtx.fillStyle = '#203824';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#2d4f32';
    for (let i = 0; i < 120; i++) {
      gCtx.fillRect((i * 37) % 250, (i * 71) % 250, 12, 8);
    }
  } else if (worldId === 'desert') {
    drawStoneTrack(tCtx, '#c48d4e', '#784c20', '#e8b968');
    pCtx.fillStyle = '#b57b3c';
    pCtx.fillRect(0, 0, 256, 256);
    pCtx.strokeStyle = '#6b4218';
    pCtx.lineWidth = 3;
    for (let y = 16; y < 256; y += 32) {
      pCtx.strokeRect(12, y, 232, 22);
    }
    gCtx.fillStyle = '#d19854';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#b87d39';
    for (let y = 0; y < 256; y += 18) {
      gCtx.fillRect(0, y, 256, 6);
    }
  } else if (worldId === 'frozen') {
    drawStoneTrack(tCtx, '#7aa7c7', '#2b4b69', '#a5f3fc', true);
    pCtx.fillStyle = '#1b2b3d';
    pCtx.fillRect(0, 0, 256, 256);
    pCtx.fillStyle = '#38bdf8';
    for (let i = 0; i < 6; i++) {
      pCtx.fillRect(118, i * 44, 20, 28);
    }
    gCtx.fillStyle = '#dbeafe';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#93c5fd';
    for (let i = 0; i < 80; i++) {
      gCtx.fillRect((i * 43) % 240, (i * 29) % 240, 14, 6);
    }
  } else if (worldId === 'sunken') {
    drawStoneTrack(tCtx, '#1c4d5e', '#0c2733', '#22d3ee', true);
    pCtx.fillStyle = '#1e424f';
    pCtx.fillRect(0, 0, 256, 256);
    pCtx.fillStyle = '#2dd4bf';
    for (let i = 0; i < 24; i++) {
      pCtx.beginPath();
      pCtx.arc((i * 59) % 240 + 8, (i * 83) % 240 + 8, 6, 0, Math.PI * 2);
      pCtx.fill();
    }
    gCtx.fillStyle = '#082736';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#0f3d52';
    for (let i = 0; i < 60; i++) {
      gCtx.fillRect((i * 29) % 256, (i * 53) % 256, 18, 6);
    }
  } else {
    drawStoneTrack(tCtx, '#3e356b', '#221c45', '#fbbf24', true);
    pCtx.fillStyle = '#2563eb';
    pCtx.fillRect(0, 0, 256, 256);
    pCtx.strokeStyle = '#fbbf24';
    pCtx.lineWidth = 6;
    for (let y = 16; y < 256; y += 48) {
      pCtx.strokeRect(10, y, 236, 32);
    }
    gCtx.fillStyle = '#130f2e';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#fde68a';
    for (let i = 0; i < 90; i++) {
      gCtx.fillRect((i * 67) % 254, (i * 41) % 254, 2, 2);
    }
  }

  const set: WorldTextureSet = {
    trackMap: configureTexture(new THREE.CanvasTexture(trackCanvas), 1, 3, maxAnisotropy),
    pillarMap: configureTexture(new THREE.CanvasTexture(pillarCanvas), 1, 2, maxAnisotropy),
    terrainMap: configureTexture(new THREE.CanvasTexture(terrainCanvas), 8, 8, maxAnisotropy),
  };
  textureCache.set(key, set);
  return set;
}
