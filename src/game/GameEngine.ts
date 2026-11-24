import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EQUIPMENT_MAP } from '../data/catalog';
import { WORLD_MAP } from '../data/worlds';
import {
  ActiveAbilityHud,
  EquipmentId,
  EquippedCosmetics,
  RunEndSummary,
  RunHudState,
  SaveData,
  WorldConfig,
  WorldId,
} from '../types/game';
import { soundEngine } from './audio/SoundEngine';
import { buildExplorerCharacter, ExplorerRig } from './three/CharacterBuilder';
import { getParticleGlowTexture } from './three/textures';
import {
  LANES,
  ObstacleKind,
  SEGMENT_LENGTH,
  SpawnedCollectible,
  SpawnedObstacle,
  TrackSegment,
  TrackSpecialZone,
  WorldAssetFactory,
} from './three/WorldBuilder';

// Pre-allocated math helpers (zero GC inside render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _colorTmp = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export interface EngineCallbacks {
  onHudUpdate: (hud: RunHudState) => void;
  onRunEnded: (summary: Omit<RunEndSummary, 'newlyUnlockedFragment' | 'newlyUnlockedWorld' | 'newlyUnlockedAchievements'>) => void;
  onContextLost?: (lost: boolean) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envTexture: THREE.Texture;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private worldDecorMesh: THREE.Group | null = null;
  private particlePoints: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;

  private assetFactory: WorldAssetFactory | null = null;
  private playerRig: ExplorerRig | null = null;
  private rivalRig: ExplorerRig | null = null;
  private pursuitMesh: THREE.Group | null = null;

  private segments: TrackSegment[] = [];
  private obstacles: SpawnedObstacle[] = [];
  private collectibles: SpawnedCollectible[] = [];
  private specialZones: TrackSpecialZone[] = [];
  private nextSegmentZ = 12;

  private worldId: WorldId = 'jungle';
  private cosmetics: EquippedCosmetics;
  private saveSnapshot: SaveData;

  private mode: 'preview' | 'playing' | 'paused' | 'ended' = 'preview';
  private frameId = 0;
  private clock = new THREE.Clock();
  private disposed = false;

  // Player kinematics
  private playerLane = 1; // 0, 1, 2
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private velY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private ropeTimer = 0;
  private gravityInverted = false;
  private invulnTimer = 0;
  private footstepAccum = 0;

  // Run state
  private currentSpeed = 15;
  private runScore = 0;
  private bonusScore = 0;
  private coinsCollected = 0;
  private gemsCollected = 0;
  private cluesFound = 0;
  private obstaclesDodged = 0;
  private oxygen = 100;
  private maxOxygen = 100;
  private checkpointReached = false;
  private inEscapeSequence = false;
  private rivalSpawned = false;
  private inSecretRoom = false;
  private secretRoomTimer = 0;
  private teleportCharges = 0;
  private bannerText: string | null = null;
  private bannerTone: 'info' | 'warning' | 'rival' | 'treasure' = 'info';
  private bannerTimer = 0;
  private hudEmitAccum = 0;
  private cameraShake = 0;
  private previewYaw = 0;

  // Equipment cooldowns & active timers
  private abilityActive = new Map<EquipmentId, number>();
  private abilityCooldown = new Map<EquipmentId, number>();

  constructor(container: HTMLElement, save: SaveData, callbacks: EngineCallbacks) {
    this.container = container;
    this.saveSnapshot = save;
    this.cosmetics = save.equippedCosmetics;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !save.settings.performanceMode,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl || save.settings.performanceMode ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !save.settings.performanceMode;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      240
    );

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;

    this.hemiLight = new THREE.HemisphereLight('#9ae6b4', '#1c2b1e', 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#ffe6a3', 1.65);
    this.keyLight.position.set(16, 28, 12);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 90;
    const d = 18;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    window.addEventListener('resize', this.handleResize);

    this.setupWorld('jungle', false);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.clock.start();
    this.scheduleNextFrame();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost?.(false);
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public updateSaveSnapshot(save: SaveData): void {
    const cosmeticsChanged =
      JSON.stringify(this.cosmetics) !== JSON.stringify(save.equippedCosmetics);
    this.saveSnapshot = save;
    this.cosmetics = save.equippedCosmetics;
    this.renderer.setPixelRatio(
      this.isSoftwareGl || save.settings.performanceMode ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    if (cosmeticsChanged) {
      this.rebuildPlayerCharacter();
    }
  }

  private rebuildPlayerCharacter(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig.dispose();
      this.playerRig = null;
    }
    this.playerRig = buildExplorerCharacter(this.cosmetics, false);
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerRig.root);
  }

  public showPreview(worldId: WorldId): void {
    this.mode = 'preview';
    soundEngine.stopMusic();
    this.setupWorld(worldId, false);
  }

  public startRun(worldId: WorldId, fromCheckpoint = false): void {
    this.worldId = worldId;
    this.mode = 'playing';
    this.setupWorld(worldId, fromCheckpoint);
    soundEngine.startWorldMusic(worldId);
  }

  public pauseRun(): void {
    if (this.mode === 'playing') {
      this.mode = 'paused';
    }
  }

  public resumeRun(): void {
    if (this.mode === 'paused') {
      this.mode = 'playing';
      this.clock.getDelta();
    }
  }

  public recoverFromFailure(): void {
    this.mode = 'playing';
    this.invulnTimer = 3.2;
    this.velY = 0;
    this.playerY = this.gravityInverted ? 7.25 : 0;
    this.isGrounded = true;
    this.oxygen = this.maxOxygen;
    // Clear nearby obstacles so player spawns safely
    this.obstacles.forEach((o) => {
      if (Math.abs(o.z - this.playerZ) < 18) {
        o.cleared = true;
        o.mesh.visible = false;
      }
    });
    this.showBanner('Recovered! Keep running!', 'info', 2.4);
    this.clock.getDelta();
  }

  private clearWorldEntities(): void {
    this.segments.forEach((s) => this.scene.remove(s.group));
    this.segments = [];
    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.obstacles = [];
    this.collectibles.forEach((c) => this.scene.remove(c.mesh));
    this.collectibles = [];
    this.specialZones = [];

    if (this.worldDecorMesh) {
      this.scene.remove(this.worldDecorMesh);
      this.worldDecorMesh = null;
    }
    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particlePoints.geometry.dispose();
      (this.particlePoints.material as THREE.Material).dispose();
      this.particlePoints = null;
    }
    if (this.rivalRig) {
      this.scene.remove(this.rivalRig.root);
      this.rivalRig.dispose();
      this.rivalRig = null;
    }
    if (this.pursuitMesh) {
      this.scene.remove(this.pursuitMesh);
      this.pursuitMesh = null;
    }
    if (this.assetFactory) {
      this.assetFactory.dispose();
      this.assetFactory = null;
    }
  }

  private setupWorld(worldId: WorldId, fromCheckpoint: boolean): void {
    this.clearWorldEntities();
    this.worldId = worldId;
    const world: WorldConfig = WORLD_MAP[worldId];

    // Sky & Fog
    _colorTmp.set(world.skyColor);
    this.scene.background = _colorTmp.clone();
    this.scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);

    // Lighting
    this.hemiLight.color.set(world.hemiSkyColor);
    this.hemiLight.groundColor.set(world.hemiGroundColor);
    this.keyLight.color.set(world.sunColor);

    this.assetFactory = new WorldAssetFactory(
      worldId,
      this.renderer.capabilities.getMaxAnisotropy()
    );

    // Reset player kinematics
    this.playerLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = fromCheckpoint ? -world.escapeStartDistance : 0;
    this.velY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.ropeTimer = 0;
    this.gravityInverted = false;
    this.invulnTimer = fromCheckpoint ? 2.5 : 0;

    this.currentSpeed = fromCheckpoint ? (world.baseSpeed + world.maxSpeed) * 0.5 : world.baseSpeed;
    if (!fromCheckpoint) {
      this.runScore = 0;
      this.bonusScore = 0;
      this.coinsCollected = 0;
      this.gemsCollected = 0;
      this.cluesFound = 0;
      this.obstaclesDodged = 0;
      this.checkpointReached = false;
      this.inEscapeSequence = false;
      this.rivalSpawned = false;
    } else {
      this.checkpointReached = true;
      this.inEscapeSequence = true;
    }

    const oxygenLevel = this.saveSnapshot.ownedEquipment.oxygen ?? 0;
    this.maxOxygen = 100 + oxygenLevel * 30;
    this.oxygen = this.maxOxygen;

    const teleportLevel = this.saveSnapshot.ownedEquipment.teleport ?? 0;
    this.teleportCharges = this.saveSnapshot.equippedEquipment.includes('teleport')
      ? Math.max(1, teleportLevel)
      : 0;

    this.abilityActive.clear();
    this.abilityCooldown.clear();
    this.inSecretRoom = false;
    this.secretRoomTimer = 0;

    this.rebuildPlayerCharacter();
    this.buildSkyBackdrop(world);
    this.buildAtmosphereParticles(world);

    // Generate initial segments
    this.nextSegmentZ = this.playerZ + 12;
    for (let i = 0; i < 8; i++) {
      this.spawnNextSegment(i < 2);
    }

    if (this.mode === 'playing') {
      this.showBanner(`${world.name} — ${world.storyIntro}`, 'info', 3.4);
      this.emitHud();
    }
  }

  private buildSkyBackdrop(world: WorldConfig): void {
    const decor = new THREE.Group();

    if (world.id === 'desert') {
      // Blazing low sunset sun disc
      const sun = new THREE.Mesh(
        new THREE.CircleGeometry(18, 24),
        new THREE.MeshBasicMaterial({ color: '#fde68a' })
      );
      sun.position.set(22, 26, -155);
      decor.add(sun);
    } else if (world.id === 'celestial') {
      // Giant glowing ringed planet (matching reference image gam1)
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(26, 24, 18),
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#0369a1',
          emissiveIntensity: 0.55,
          roughness: 0.6,
        })
      );
      planet.position.set(-14, 34, -155);
      decor.add(planet);

      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(9, 16, 14),
        new THREE.MeshStandardMaterial({
          color: '#fde68a',
          emissive: '#d97706',
          emissiveIntensity: 0.4,
        })
      );
      moon.position.set(34, 46, -145);
      decor.add(moon);
    } else if (world.id === 'frozen') {
      // Distant obsidian Ice Citadel silhouette
      const citadel = new THREE.Mesh(
        new THREE.ConeGeometry(16, 44, 6),
        new THREE.MeshStandardMaterial({
          color: '#0f172a',
          emissive: '#0284c7',
          emissiveIntensity: 0.35,
        })
      );
      citadel.position.set(0, 18, -150);
      decor.add(citadel);
    } else if (world.id === 'sunken') {
      // Diagonal glowing sunlight shafts underwater
      for (let i = -2; i <= 2; i++) {
        const beam = new THREE.Mesh(
          new THREE.PlaneGeometry(7, 90),
          new THREE.MeshBasicMaterial({
            color: '#67e8f9',
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        beam.position.set(i * 12, 28, -95);
        beam.rotation.z = -0.35;
        decor.add(beam);
      }
    }

    this.worldDecorMesh = decor;
    this.scene.add(decor);
  }

  private buildAtmosphereParticles(world: WorldConfig): void {
    const count = this.isSoftwareGl ? 90 : 220;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 1] = Math.random() * 16;
      pos[i * 3 + 2] = -Math.random() * 90;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const colorMap: Record<WorldId, string> = {
      jungle: '#a7f3d0',
      desert: '#fcd34d',
      frozen: '#e0f2fe',
      sunken: '#67e8f9',
      celestial: '#f5d0fe',
    };

    const mat = new THREE.PointsMaterial({
      color: colorMap[world.id],
      size: world.id === 'frozen' ? 0.35 : 0.28,
      map: getParticleGlowTexture(),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    this.particlePositions = pos;
    this.particlePoints = new THREE.Points(geo, mat);
    this.scene.add(this.particlePoints);
  }

  private spawnNextSegment(safeZone = false): void {
    if (!this.assetFactory) return;
    const zStart = this.nextSegmentZ;
    const distFromOrigin = Math.abs(zStart);

    const isJungleGap =
      !safeZone &&
      this.worldId === 'jungle' &&
      !this.inSecretRoom &&
      Math.random() < 0.26 &&
      this.segments.length % 2 === 1;

    const isIcePatch =
      !safeZone &&
      this.worldId === 'frozen' &&
      !this.inSecretRoom &&
      Math.random() < 0.45;

    const isGravityPad =
      !safeZone &&
      this.worldId === 'celestial' &&
      !this.inSecretRoom &&
      distFromOrigin > 120 &&
      this.segments.length % 4 === 2;

    const { segment, zones } = this.assetFactory.createTrackSegment(zStart, {
      hasGap: isJungleGap,
      hasCeilingTrack: this.worldId === 'celestial',
      hasIcePatch: isIcePatch,
      hasGravityPad: isGravityPad,
    });

    this.scene.add(segment.group);
    this.segments.push(segment);
    this.specialZones.push(...zones);
    this.nextSegmentZ -= SEGMENT_LENGTH;

    if (safeZone) return;

    // Secret Treasure Room Rush: pure treasure & clues!
    if (this.inSecretRoom) {
      for (let lane = 0; lane < 3; lane++) {
        for (let step = 0; step < 3; step++) {
          const cz = zStart - 4 - step * 6;
          const kind = step === 1 && lane === 1 ? 'gem' : 'coin';
          const c = this.assetFactory.createCollectible(kind, lane, cz, 0.9);
          this.scene.add(c.mesh);
          this.collectibles.push(c);
        }
      }
      if (Math.random() < 0.4) {
        const clue = this.assetFactory.createCollectible('clue', 1, zStart - 12, 1.1);
        this.scene.add(clue.mesh);
        this.collectibles.push(clue);
      }
      return;
    }

    // Spawn obstacles safely (never block all 3 lanes!)
    if (!isJungleGap) {
      const numRows = this.inEscapeSequence ? 2 : 1;
      for (let row = 0; row < numRows; row++) {
        const oz = zStart - 8 - row * 11;
        const blockedLanes = this.pickFairObstacles(oz);
        const openLane = [0, 1, 2].find((l) => !blockedLanes.includes(l)) ?? 1;

        // Coin arc in open lane
        for (let k = 0; k < 3; k++) {
          const cz = oz + 3 - k * 2.5;
          const cy = this.gravityInverted ? 6.4 : 0.85;
          const coin = this.assetFactory.createCollectible('coin', openLane, cz, cy);
          this.scene.add(coin.mesh);
          this.collectibles.push(coin);
        }

        // Rare collectibles: Oxygen bubbles in Sunken City, Gems, Clues, Secret Portals
        if (this.worldId === 'sunken' && Math.random() < 0.55) {
          const oxy = this.assetFactory.createCollectible('oxygen', openLane, oz - 4, 1.15);
          this.scene.add(oxy.mesh);
          this.collectibles.push(oxy);
        } else if (Math.random() < 0.24) {
          const gem = this.assetFactory.createCollectible(
            'gem',
            openLane,
            oz - 4,
            this.gravityInverted ? 6.2 : 1.0
          );
          this.scene.add(gem.mesh);
          this.collectibles.push(gem);
        }

        // Treasure Compass boosts clue & secret portal spawn rate
        const compassActive = (this.abilityActive.get('compass') ?? 0) > 0;
        if (Math.random() < (compassActive ? 0.35 : 0.12)) {
          const sideLane = (openLane + 1) % 3;
          const kind = Math.random() < 0.45 ? 'secret_portal' : 'clue';
          const item = this.assetFactory.createCollectible(kind, sideLane, oz - 5, 0.9);
          this.scene.add(item.mesh);
          this.collectibles.push(item);
        }
      }
    } else {
      // Coins suspended over rope swing gap
      for (let k = 0; k < 3; k++) {
        const coin = this.assetFactory.createCollectible(
          'coin',
          1,
          segment.gapZStart - 1.5 - k * 2.2,
          2.8
        );
        this.scene.add(coin.mesh);
        this.collectibles.push(coin);
      }
    }
  }

  private pickFairObstacles(z: number): number[] {
    if (!this.assetFactory) return [];

    const worldPool: Record<WorldId, ObstacleKind[]> = {
      jungle: ['low_barrier', 'high_beam', 'full_pillar', 'rolling_boulder'],
      desert: ['quicksand', 'sand_geyser', 'high_beam', 'rolling_boulder'],
      frozen: ['low_barrier', 'high_beam', 'ice_wall', 'rolling_boulder'],
      sunken: ['electric_barrier', 'high_beam', 'sea_creature', 'full_pillar'],
      celestial: ['energy_barrier', 'high_beam', 'full_pillar', 'rolling_boulder'],
    };

    const pool = worldPool[this.worldId];
    const openLane = Math.floor(Math.random() * 3);
    const blocked: number[] = [];

    // Place 1 or 2 obstacles, always leaving openLane clear!
    const count = Math.random() < (this.inEscapeSequence ? 0.7 : 0.45) ? 2 : 1;
    const candidateLanes = [0, 1, 2].filter((l) => l !== openLane);

    for (let i = 0; i < count && i < candidateLanes.length; i++) {
      const lane = candidateLanes[i];
      const kind = pool[Math.floor(Math.random() * pool.length)];
      const obs = this.assetFactory.createObstacle(kind, lane, z, this.gravityInverted);
      this.scene.add(obs.mesh);
      this.obstacles.push(obs);
      blocked.push(lane);
    }
    return blocked;
  }

  // Controls
  public moveLeft(): void {
    if (this.mode !== 'playing') return;
    if (this.playerLane > 0) {
      this.playerLane--;
      soundEngine.playLaneSwitch();
    }
  }

  public moveRight(): void {
    if (this.mode !== 'playing') return;
    if (this.playerLane < 2) {
      this.playerLane++;
      soundEngine.playLaneSwitch();
    }
  }

  public jump(): void {
    if (this.mode !== 'playing') return;
    if (this.isGrounded || this.ropeTimer > 0) {
      const bootsTimer = this.abilityActive.get('boots') ?? 0;
      const bootsLevel = this.saveSnapshot.ownedEquipment.boots ?? 1;
      const jumpMult = bootsTimer > 0 ? 1.25 + (bootsLevel - 1) * 0.08 : 1.0;

      this.velY = (this.gravityInverted ? -14.2 : 14.2) * jumpMult;
      this.isGrounded = false;
      this.slideTimer = 0;
      this.ropeTimer = 0;
      soundEngine.playJump();
    }
  }

  public slide(): void {
    if (this.mode !== 'playing') return;
    if (this.isGrounded) {
      this.slideTimer = 0.72;
      soundEngine.playSlide();
    } else {
      // Fast-fall in mid-air
      this.velY = this.gravityInverted ? 18 : -18;
      this.slideTimer = 0.55;
    }
  }

  public activateEquipment(id: EquipmentId): void {
    if (this.mode !== 'playing') return;
    if (!this.saveSnapshot.equippedEquipment.includes(id)) return;
    const def = EQUIPMENT_MAP[id];
    const level = this.saveSnapshot.ownedEquipment[id] ?? 1;
    const cd = this.abilityCooldown.get(id) ?? 0;
    if (cd > 0 || id === 'teleport') return;

    soundEngine.playEquipment();
    const duration = def.durationSec + (level - 1) * 2;
    this.abilityActive.set(id, duration);
    const effectiveCooldown =
      id === 'grappling' ? Math.max(8, def.cooldownSec - (level - 1) * 2) : def.cooldownSec;
    this.abilityCooldown.set(id, effectiveCooldown);

    if (id === 'oxygen') {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + 55);
      this.showBanner('Oxygen Helmet Surge! +55% Air', 'info', 2.0);
    } else if (id === 'grappling') {
      // Leap-dash forward safely
      this.velY = this.gravityInverted ? -11 : 11;
      this.isGrounded = false;
      this.invulnTimer = Math.max(this.invulnTimer, 1.5);
      this.showBanner('Grappling Hook Launch!', 'info', 1.8);
    } else if (id === 'shield') {
      this.showBanner('Protective Shield Activated!', 'info', 1.8);
    } else if (id === 'boots') {
      this.showBanner('Power Boots Engaged!', 'info', 1.8);
    } else if (id === 'compass') {
      this.showBanner('Treasure Compass Scanning for Secrets!', 'treasure', 2.2);
    }
  }

  private showBanner(
    text: string,
    tone: 'info' | 'warning' | 'rival' | 'treasure',
    duration = 2.6
  ): void {
    this.bannerText = text;
    this.bannerTone = tone;
    this.bannerTimer = duration;
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.mode === 'preview') {
      this.updatePreview(delta, elapsed);
    } else if (this.mode === 'playing') {
      this.updateGameplay(delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private updatePreview(delta: number, elapsed: number): void {
    this.previewYaw += delta * 0.25;
    if (this.playerRig) {
      this.playerRig.root.position.set(0, 0, 0);
      this.animateExplorer(delta, elapsed, true);
    }
    const radius = 5.4;
    _camTargetPos.set(
      Math.sin(this.previewYaw) * radius * 0.45,
      2.35,
      Math.cos(this.previewYaw * 0.5) * 0.8 + 4.4
    );
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-4 * delta));
    _camLookAt.set(0, 1.25, -2.5);
    this.camera.lookAt(_camLookAt);
  }

  private updateGameplay(delta: number, elapsed: number): void {
    const world = WORLD_MAP[this.worldId];

    // Timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - delta);
    if (this.slideTimer > 0) this.slideTimer = Math.max(0, this.slideTimer - delta);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }

    this.abilityActive.forEach((val, key) => {
      if (val > 0) this.abilityActive.set(key, Math.max(0, val - delta));
    });
    this.abilityCooldown.forEach((val, key) => {
      if (val > 0) this.abilityCooldown.set(key, Math.max(0, val - delta));
    });

    if (this.inSecretRoom) {
      this.secretRoomTimer -= delta;
      if (this.secretRoomTimer <= 0) {
        this.inSecretRoom = false;
        this.invulnTimer = 2.0;
        this.showBanner('Exiting Secret Treasure Vault!', 'treasure', 2.0);
      }
    }

    // Distance & speed progression
    const distance = Math.abs(this.playerZ);
    const progressRatio = Math.min(1, distance / world.targetDistance);
    const targetSpeed = THREE.MathUtils.lerp(world.baseSpeed, world.maxSpeed, progressRatio);

    // Check ice momentum
    const onIce = this.specialZones.some(
      (z) => z.type === 'ice_patch' && this.playerZ <= z.zStart && this.playerZ >= z.zEnd
    );
    const speedBoost = onIce ? 4.2 : this.inEscapeSequence ? 2.5 : 0;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed + speedBoost, 3.0, delta);

    // Move forward along -Z
    const prevZ = this.playerZ;
    this.playerZ -= this.currentSpeed * delta;
    this.runScore += Math.abs(this.playerZ - prevZ) * 1.4;

    // Trigger Rival appearance around 35%
    if (!this.rivalSpawned && distance >= world.targetDistance * 0.35) {
      this.rivalSpawned = true;
      this.spawnRivalEncounter();
      this.showBanner(world.rivalTaunt, 'rival', 3.6);
    }

    // Trigger Escape Sequence & Checkpoint at escapeStartDistance
    if (!this.inEscapeSequence && distance >= world.escapeStartDistance) {
      this.inEscapeSequence = true;
      this.checkpointReached = true;
      this.cameraShake = 0.55;
      this.spawnPursuitHazard();
      this.showBanner(`${world.escapeTitle}! Checkpoint Reached!`, 'warning', 3.4);
      soundEngine.playEquipment();
    }

    // Victory check!
    if (distance >= world.targetDistance) {
      this.finishRun(true, '');
      return;
    }

    // Sunken City Oxygen Mechanic
    if (this.worldId === 'sunken') {
      const helmetActive = (this.abilityActive.get('oxygen') ?? 0) > 0;
      const drainRate = helmetActive ? 2.8 : this.inEscapeSequence ? 7.5 : 5.4;
      this.oxygen = Math.max(0, this.oxygen - drainRate * delta);
      if (this.oxygen <= 0) {
        this.handleFatalImpact('Ran out of oxygen in The Sunken City');
        return;
      }
    }

    // Desert Sandstorm Fog Modulation
    let inSandstorm = false;
    if (this.worldId === 'desert' && this.scene.fog instanceof THREE.FogExp2) {
      inSandstorm = Math.sin(elapsed * 0.35) > 0.35;
      const targetFog = inSandstorm ? 0.032 : world.fogDensity;
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetFog, 2.0, delta);
    }

    // Lane lateral damping (slower grip on ice!)
    const targetX = LANES[this.playerLane];
    const laneDamp = onIce ? 5.5 : 13.5;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, laneDamp, delta);

    // Special Zones: Rope Swing & Gravity Flip
    this.handleSpecialZones(delta);

    // Vertical physics (gravity / jumping / rope)
    if (this.ropeTimer > 0) {
      this.ropeTimer -= delta;
      this.playerY = THREE.MathUtils.damp(this.playerY, 2.6, 10, delta);
    } else if (!this.gravityInverted) {
      this.velY -= 38 * delta;
      this.playerY += this.velY * delta;
      if (this.playerY <= 0) {
        // Check if over an open gap in Jungle
        const overGap = this.segments.some(
          (s) => s.hasGap && this.playerZ <= s.gapZStart && this.playerZ >= s.gapZEnd
        );
        if (overGap) {
          if (this.playerY < -3.8) {
            this.handleFatalImpact('Fell into a deep jungle river chasm');
            return;
          }
        } else {
          this.playerY = 0;
          this.velY = 0;
          this.isGrounded = true;
        }
      }
    } else {
      // Inverted gravity (running on Celestial ceiling at y = 7.25)
      this.velY += 38 * delta;
      this.playerY += this.velY * delta;
      if (this.playerY >= 7.25) {
        this.playerY = 7.25;
        this.velY = 0;
        this.isGrounded = true;
      }
    }

    // Update character rig & equipment visuals
    if (this.playerRig) {
      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      const targetRotX = this.gravityInverted ? Math.PI : 0;
      this.playerRig.root.rotation.x = THREE.MathUtils.damp(
        this.playerRig.root.rotation.x,
        targetRotX,
        10,
        delta
      );
      this.playerRig.shieldBubble.visible =
        (this.abilityActive.get('shield') ?? 0) > 0 || this.invulnTimer > 0;
      const bootsOn = (this.abilityActive.get('boots') ?? 0) > 0;
      this.playerRig.bootsGlowLeft.visible = bootsOn;
      this.playerRig.bootsGlowRight.visible = bootsOn;
      this.animateExplorer(delta, elapsed, false);
    }

    // Update Rival & Pursuit Hazard
    if (this.rivalRig) {
      this.rivalRig.root.position.z -= (this.currentSpeed + 3.5) * delta;
      if (this.rivalRig.root.position.z < this.playerZ - 75) {
        this.scene.remove(this.rivalRig.root);
        this.rivalRig.dispose();
        this.rivalRig = null;
      }
    }
    if (this.pursuitMesh) {
      this.pursuitMesh.position.set(0, 2.2, this.playerZ + 11.5);
      this.pursuitMesh.rotation.x -= delta * 2.5;
    }

    // Update obstacles & check collisions
    if (this.updateObstacles(delta, elapsed)) return;

    // Update collectibles
    this.updateCollectibles(delta, elapsed);

    // Recycle & spawn segments ahead
    while (this.nextSegmentZ > this.playerZ - 135) {
      this.spawnNextSegment(false);
    }
    this.cleanupBehindPlayer();

    // Animate scenery & particles
    this.updateAtmosphere(delta, elapsed);

    // Update keyLight & camera follow
    this.keyLight.position.set(this.playerX + 16, 28, this.playerZ + 12);
    this.keyLight.target.position.set(this.playerX, 0, this.playerZ - 12);
    this.updateGameplayCamera(delta, onIce, inSandstorm);

    // Emit HUD at ~18Hz
    this.hudEmitAccum += delta;
    if (this.hudEmitAccum >= 0.055) {
      this.hudEmitAccum = 0;
      this.emitHud(onIce, inSandstorm);
    }
  }

  private handleSpecialZones(delta: number): void {
    for (const zone of this.specialZones) {
      if (this.playerZ <= zone.zStart && this.playerZ >= zone.zEnd) {
        if (zone.type === 'gap_rope' && !zone.triggered) {
          const grapplingReady =
            this.saveSnapshot.equippedEquipment.includes('grappling') &&
            (this.abilityCooldown.get('grappling') ?? 0) <= 0;
          if (!this.isGrounded || grapplingReady) {
            zone.triggered = true;
            this.ropeTimer = 0.52;
            this.isGrounded = false;
            this.bonusScore += 35;
            soundEngine.playRopeLatch();
            if (grapplingReady && this.isGrounded) {
              this.abilityCooldown.set('grappling', 10);
            }
          }
        } else if (zone.type === 'gravity_pad' && !zone.triggered) {
          zone.triggered = true;
          this.gravityInverted = !this.gravityInverted;
          this.isGrounded = false;
          this.velY = this.gravityInverted ? 12 : -12;
          this.bonusScore += 40;
          soundEngine.playEquipment();
          this.showBanner(
            this.gravityInverted ? 'Gravity Inverted!' : 'Gravity Restored!',
            'info',
            1.6
          );
        }
      }
      if (zone.ropeHook) {
        zone.ropeHook.rotation.x = Math.sin(this.clock.elapsedTime * 3) * 0.14;
      }
    }
    void delta;
  }

  private updateObstacles(delta: number, elapsed: number): boolean {
    const playerHeight = this.slideTimer > 0 ? 0.72 : 1.7;
    const playerMinY = this.gravityInverted ? 7.25 - this.playerY : this.playerY;
    const playerMaxY = playerMinY + playerHeight;

    for (const obs of this.obstacles) {
      if (obs.cleared || !obs.mesh.visible) continue;

      if (obs.speedOffset > 0) {
        obs.z += obs.speedOffset * delta;
        obs.mesh.position.z = obs.z;
        if (obs.animatedPart) {
          obs.animatedPart.rotation.x += delta * 5.5;
        }
      }
      if (obs.kind === 'sand_geyser' && obs.animatedPart) {
        obs.animatedPart.scale.y = 0.85 + Math.sin(elapsed * 8 + obs.z) * 0.25;
      }

      // Mark dodged once safely passed behind player
      if (obs.z > this.playerZ + 1.4) {
        obs.cleared = true;
        this.obstaclesDodged++;
        this.runScore += 8;
        continue;
      }

      // Collision check
      const dz = Math.abs(obs.z - this.playerZ);
      const dx = Math.abs(LANES[obs.lane] - this.playerX);
      if (dz < 0.72 && dx < obs.width * 0.48) {
        // Check Y overlap in local ground coordinates
        const obsMinY = obs.yBase;
        const obsMaxY = obs.yBase + obs.height;
        const overlapsY = playerMaxY > obsMinY + 0.1 && playerMinY < obsMaxY - 0.1;

        if (overlapsY) {
          if (this.invulnTimer > 0) {
            obs.cleared = true;
            obs.mesh.visible = false;
            continue;
          }
          // Check Protective Shield
          if ((this.abilityActive.get('shield') ?? 0) > 0) {
            this.abilityActive.set('shield', 0);
            this.invulnTimer = 1.6;
            obs.cleared = true;
            obs.mesh.visible = false;
            this.cameraShake = 0.4;
            soundEngine.playCollision(true);
            this.showBanner('Protective Shield Absorbed Impact!', 'info', 2.0);
            continue;
          }

          const causeMap: Record<ObstacleKind, string> = {
            low_barrier: 'Tripped over an ancient barrier',
            high_beam: 'Collided with an overhead beam (slide underneath!)',
            full_pillar: 'Crashed into a stone monolith',
            rolling_boulder: 'Struck by a rolling temple boulder',
            quicksand: 'Trapped in desert quicksand',
            sand_geyser: 'Launched by an erupting sand geyser',
            electric_barrier: 'Shocked by an abyssal electric barrier',
            sea_creature: 'Collided with a deep-sea creature',
            ice_wall: 'Shattered against a frozen ice wall',
            energy_barrier: 'Hit a Celestial energy barrier',
          };

          this.handleFatalImpact(causeMap[obs.kind]);
          return true;
        }
      }
    }
    return false;
  }

  private updateCollectibles(delta: number, elapsed: number): void {
    const compassActive = (this.abilityActive.get('compass') ?? 0) > 0;
    const magnetRange = compassActive ? 6.5 : 1.7;

    for (const c of this.collectibles) {
      if (c.collected) continue;
      c.mesh.rotation.y += delta * 2.8;
      c.mesh.position.y = c.y + Math.sin(elapsed * 3.5 + c.z) * 0.12;

      const dx = LANES[c.lane] - this.playerX;
      const dz = c.z - this.playerZ;
      const distSq = dx * dx + dz * dz;

      if (c.kind === 'coin' && compassActive && distSq < magnetRange * magnetRange) {
        c.mesh.position.x = THREE.MathUtils.damp(c.mesh.position.x, this.playerX, 10, delta);
        c.mesh.position.z = THREE.MathUtils.damp(c.mesh.position.z, this.playerZ, 10, delta);
        c.z = c.mesh.position.z;
      }

      if (Math.abs(c.mesh.position.x - this.playerX) < 1.15 && Math.abs(c.z - this.playerZ) < 1.25) {
        const yTarget = this.gravityInverted ? 6.5 : this.playerY + 0.9;
        if (Math.abs(c.y - yTarget) < 1.9) {
          c.collected = true;
          c.mesh.visible = false;

          if (c.kind === 'coin') {
            this.coinsCollected++;
            this.runScore += 10;
            soundEngine.playCoin();
          } else if (c.kind === 'gem') {
            this.gemsCollected++;
            this.bonusScore += 35;
            soundEngine.playGemOrClue();
          } else if (c.kind === 'clue') {
            this.cluesFound++;
            const compassLvl = this.saveSnapshot.ownedEquipment.compass ?? 1;
            const bonus = 50 + (compassLvl - 1) * 15;
            this.bonusScore += bonus;
            soundEngine.playGemOrClue();
            this.showBanner(`Hidden Map Clue Discovered! +${bonus} Score`, 'treasure', 2.4);
          } else if (c.kind === 'oxygen') {
            this.oxygen = Math.min(this.maxOxygen, this.oxygen + 35);
            soundEngine.playOxygenBubble();
          } else if (c.kind === 'secret_portal') {
            this.inSecretRoom = true;
            this.secretRoomTimer = 8.5;
            this.bonusScore += 80;
            soundEngine.playVictory();
            this.showBanner('Secret Treasure Room Discovered!', 'treasure', 3.0);
          }
        }
      }
    }
  }

  private handleFatalImpact(cause: string): void {
    this.cameraShake = 0.75;
    soundEngine.playCollision(false);

    // Auto-trigger Teleport Crystal if equipped & charges remain!
    if (this.teleportCharges > 0) {
      this.teleportCharges--;
      this.invulnTimer = 3.0;
      this.obstacles.forEach((o) => {
        if (Math.abs(o.z - this.playerZ) < 14) {
          o.cleared = true;
          o.mesh.visible = false;
        }
      });
      this.playerY = this.gravityInverted ? 7.25 : 0;
      this.velY = 0;
      this.isGrounded = true;
      this.oxygen = Math.max(this.oxygen, this.maxOxygen * 0.6);
      soundEngine.playEquipment();
      this.showBanner('Teleport Crystal Saved You!', 'treasure', 2.5);
      return;
    }

    this.finishRun(false, cause);
  }

  private finishRun(victory: boolean, cause: string): void {
    this.mode = 'ended';
    soundEngine.stopMusic();
    if (victory) {
      soundEngine.playVictory();
    }

    const totalRunScore = Math.floor(this.runScore) + this.bonusScore + (victory ? 180 : 0);
    this.emitHud();

    this.callbacks.onRunEnded({
      worldId: this.worldId,
      victory,
      causeOfFailure: cause,
      runScore: Math.floor(this.runScore),
      bonusScore: this.bonusScore + (victory ? 180 : 0),
      totalScoreEarned: totalRunScore,
      coinsCollected: this.coinsCollected,
      gemsCollected: this.gemsCollected,
      cluesFound: this.cluesFound,
      creditsEarned: this.cluesFound > 0 ? 1 : 0,
      distanceTravelled: Math.abs(this.playerZ),
      obstaclesDodged: this.obstaclesDodged,
      checkpointReached: this.checkpointReached,
      canUseTeleportCrystal: false,
      canUseAncientCredits: !victory && this.saveSnapshot.ancientCredits > 0,
    });
  }

  private spawnRivalEncounter(): void {
    this.rivalRig = buildExplorerCharacter(this.cosmetics, true);
    this.rivalRig.root.position.set(LANES[1], 0, this.playerZ - 18);
    this.scene.add(this.rivalRig.root);
  }

  private spawnPursuitHazard(): void {
    const group = new THREE.Group();
    const colorMap: Record<WorldId, string> = {
      jungle: '#57534e',
      desert: '#b45309',
      frozen: '#e0f2fe',
      sunken: '#0891b2',
      celestial: '#c026d3',
    };
    const core = new THREE.Mesh(
      new THREE.DodecahedronGeometry(3.2, 1),
      new THREE.MeshStandardMaterial({
        color: colorMap[this.worldId],
        emissive: colorMap[this.worldId],
        emissiveIntensity: this.worldId === 'celestial' ? 0.8 : 0.15,
        roughness: 0.75,
      })
    );
    group.add(core);
    this.pursuitMesh = group;
    this.scene.add(group);
  }

  private animateExplorer(delta: number, elapsed: number, gentleJog: boolean): void {
    if (!this.playerRig) return;
    const rig = this.playerRig;

    // Bank into lane switch
    const dx = LANES[this.playerLane] - this.playerX;
    rig.bodyPivot.rotation.z = THREE.MathUtils.damp(
      rig.bodyPivot.rotation.z,
      gentleJog ? 0 : -dx * 0.12,
      10,
      delta
    );

    if (this.slideTimer > 0) {
      rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, -0.45, 16, delta);
      rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, -0.9, 16, delta);
      rig.leftLeg.rotation.x = 0.85;
      rig.rightLeg.rotation.x = 0.45;
      return;
    }

    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, 0, 14, delta);

    if (!this.isGrounded && !gentleJog) {
      rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, 0.25, 10, delta);
      rig.leftLeg.rotation.x = 0.55;
      rig.rightLeg.rotation.x = -0.45;
      rig.leftArm.rotation.x = -0.9;
      rig.rightArm.rotation.x = -0.9;
    } else {
      const freq = gentleJog ? 7 : 12 + (this.currentSpeed - 15) * 0.45;
      const swing = Math.sin(elapsed * freq) * (gentleJog ? 0.45 : 0.85);
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.85;
      rig.rightArm.rotation.x = swing * 0.85;
      rig.torso.rotation.x = gentleJog ? 0.08 : 0.22;
      rig.torso.position.y = 0.82 + Math.abs(Math.cos(elapsed * freq)) * 0.07;

      if (!gentleJog) {
        this.footstepAccum += delta * freq;
        if (this.footstepAccum >= Math.PI) {
          this.footstepAccum -= Math.PI;
          soundEngine.playFootstep(this.worldId);
        }
      }
    }

    if (rig.capeMesh) {
      rig.capeMesh.rotation.x = 0.45 + Math.sin(elapsed * 14) * 0.14;
    }
  }

  private updateGameplayCamera(delta: number, onIce: boolean, inSandstorm: boolean): void {
    const targetFov = this.inEscapeSequence || onIce ? 70 : this.inSecretRoom ? 67 : 62;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, delta);
    this.camera.updateProjectionMatrix();

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - delta * 1.4);
    }
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.5;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.5;

    const camY = this.gravityInverted ? 4.3 : this.playerY * 0.55 + 3.6;
    _camTargetPos.set(
      this.playerX * 0.65 + shakeX,
      camY + shakeY,
      this.playerZ + (inSandstorm ? 6.2 : 7.4)
    );
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-9 * delta));

    _camLookAt.set(
      this.playerX * 0.45,
      this.gravityInverted ? 5.6 : this.playerY * 0.45 + 1.35,
      this.playerZ - 11
    );
    this.camera.lookAt(_camLookAt);
  }

  private updateAtmosphere(delta: number, elapsed: number): void {
    for (const seg of this.segments) {
      for (const obj of seg.animatedObjects) {
        if (this.worldId === 'celestial') {
          obj.rotation.y += delta * 0.6;
          obj.position.y += Math.sin(elapsed * 1.5 + obj.position.x) * delta * 0.3;
        } else if (this.worldId === 'sunken') {
          obj.position.x += Math.sin(elapsed * 1.2 + obj.position.z) * delta * 1.2;
        }
      }
    }

    if (this.particlePoints && this.particlePositions) {
      const pos = this.particlePositions;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        if (this.worldId === 'sunken') {
          pos[idx + 1] += delta * 2.2;
          if (pos[idx + 1] > 16) pos[idx + 1] = 0;
        } else if (this.worldId === 'desert') {
          pos[idx] += delta * 11;
          if (pos[idx] > 19) pos[idx] = -19;
        } else {
          pos[idx + 1] -= delta * (this.worldId === 'frozen' ? 4.2 : 2.6);
          if (pos[idx + 1] < 0) pos[idx + 1] = 16;
        }
        if (pos[idx + 2] > this.playerZ + 12) {
          pos[idx + 2] = this.playerZ - 75 - Math.random() * 20;
        }
      }
      this.particlePoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  private cleanupBehindPlayer(): void {
    const cutoffZ = this.playerZ + 28;
    while (this.segments.length > 0 && this.segments[0].zEnd > cutoffZ) {
      const seg = this.segments.shift()!;
      this.scene.remove(seg.group);
    }
    this.obstacles = this.obstacles.filter((o) => {
      if (o.z > cutoffZ) {
        this.scene.remove(o.mesh);
        return false;
      }
      return true;
    });
    this.collectibles = this.collectibles.filter((c) => {
      if (c.z > cutoffZ) {
        this.scene.remove(c.mesh);
        return false;
      }
      return true;
    });
    this.specialZones = this.specialZones.filter((z) => z.zEnd <= cutoffZ);
  }

  private emitHud(onIce = false, inSandstorm = false): void {
    const world = WORLD_MAP[this.worldId];
    const abilities: ActiveAbilityHud[] = this.saveSnapshot.equippedEquipment.map((id) => {
      const def = EQUIPMENT_MAP[id];
      const level = this.saveSnapshot.ownedEquipment[id] ?? 1;
      const activeRemaining = this.abilityActive.get(id) ?? 0;
      const cooldownRemaining = this.abilityCooldown.get(id) ?? 0;
      return {
        id,
        name: def.name,
        activeRemaining,
        cooldownRemaining,
        durationTotal: def.durationSec + (level - 1) * 2,
        ready: id !== 'teleport' && cooldownRemaining <= 0,
      };
    });

    const distance = Math.abs(this.playerZ);
    const escapeProgress = this.inEscapeSequence
      ? Math.min(
          1,
          (distance - world.escapeStartDistance) /
            Math.max(1, world.targetDistance - world.escapeStartDistance)
        )
      : 0;

    this.callbacks.onHudUpdate({
      worldId: this.worldId,
      runScore: Math.floor(this.runScore) + this.bonusScore,
      coins: this.coinsCollected,
      gems: this.gemsCollected,
      distance: Math.floor(distance),
      targetDistance: world.targetDistance,
      speed: Math.round(this.currentSpeed),
      oxygen: Math.round(this.oxygen),
      maxOxygen: this.maxOxygen,
      gravityInverted: this.gravityInverted,
      inEscapeSequence: this.inEscapeSequence,
      escapeProgress,
      inSecretRoom: this.inSecretRoom,
      secretRoomRemaining: Math.ceil(this.secretRoomTimer),
      shieldActive: (this.abilityActive.get('shield') ?? 0) > 0,
      bootsActive: (this.abilityActive.get('boots') ?? 0) > 0,
      compassActive: (this.abilityActive.get('compass') ?? 0) > 0,
      onIce,
      inSandstorm,
      onRope: this.ropeTimer > 0,
      checkpointReached: this.checkpointReached,
      cluesThisRun: this.cluesFound,
      obstaclesDodged: this.obstaclesDodged,
      bannerText: this.bannerText,
      bannerTone: this.bannerTone,
      abilities,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearWorldEntities();
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig.dispose();
      this.playerRig = null;
    }
    this.envTexture.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
