import * as THREE from 'three';
import { WORLD_MAP } from '../../data/worlds';
import { WorldId } from '../../types/game';
import { getWorldTextures } from './textures';

export const LANE_WIDTH = 2.6;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
export const TRACK_WIDTH = 9.2;
export const SEGMENT_LENGTH = 24;

export type ObstacleKind =
  | 'low_barrier' // jump over
  | 'high_beam' // slide under
  | 'full_pillar' // dodge left/right
  | 'rolling_boulder' // dodge left/right (moves forward)
  | 'quicksand' // jump over
  | 'sand_geyser' // dodge left/right
  | 'electric_barrier' // slide under or dodge
  | 'sea_creature' // dodge left/right
  | 'ice_wall' // dodge left/right
  | 'energy_barrier'; // jump over

export interface SpawnedObstacle {
  mesh: THREE.Group;
  kind: ObstacleKind;
  lane: number; // 0, 1, 2
  z: number;
  width: number;
  height: number;
  yBase: number;
  inverted: boolean;
  speedOffset: number;
  cleared: boolean;
  animatedPart?: THREE.Object3D;
}

export type CollectibleKind = 'coin' | 'gem' | 'clue' | 'oxygen' | 'secret_portal';

export interface SpawnedCollectible {
  mesh: THREE.Group;
  kind: CollectibleKind;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

export interface TrackSpecialZone {
  type: 'gap_rope' | 'ice_patch' | 'gravity_pad';
  zStart: number;
  zEnd: number;
  ropeHook?: THREE.Group;
  triggered?: boolean;
}

export interface TrackSegment {
  group: THREE.Group;
  zStart: number; // closer to 0 (south)
  zEnd: number; // further negative (north)
  hasGap: boolean;
  gapZStart: number;
  gapZEnd: number;
  animatedObjects: THREE.Object3D[];
}

export class WorldAssetFactory {
  private disposables: Array<{ dispose: () => void }> = [];
  private worldId: WorldId;
  private maxAnisotropy: number;

  // Shared geometries & materials for performance
  public coinGeo: THREE.CylinderGeometry;
  public coinMat: THREE.MeshStandardMaterial;
  public gemGeo: THREE.OctahedronGeometry;
  public gemMat: THREE.MeshStandardMaterial;
  public clueMat: THREE.MeshStandardMaterial;
  public oxygenMat: THREE.MeshStandardMaterial;
  public portalMat: THREE.MeshStandardMaterial;

  constructor(worldId: WorldId, maxAnisotropy: number) {
    this.worldId = worldId;
    this.maxAnisotropy = maxAnisotropy;

    this.coinGeo = this.track(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 14));
    this.coinGeo.rotateX(Math.PI / 2);
    this.coinMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#92400e',
        emissiveIntensity: 0.35,
        metalness: 0.88,
        roughness: 0.2,
      })
    );

    this.gemGeo = this.track(new THREE.OctahedronGeometry(0.45, 0));
    this.gemMat = this.track(
      new THREE.MeshStandardMaterial({
        color: WORLD_MAP[worldId].fragmentColor,
        emissive: WORLD_MAP[worldId].fragmentColor,
        emissiveIntensity: 0.7,
        metalness: 0.25,
        roughness: 0.15,
      })
    );

    this.clueMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#eab308',
        emissiveIntensity: 0.65,
        roughness: 0.35,
      })
    );

    this.oxygenMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        emissive: '#06b6d4',
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.78,
        roughness: 0.1,
      })
    );

    this.portalMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#d97706',
        emissiveIntensity: 1.25,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
  }

  private track<T extends { dispose: () => void }>(res: T): T {
    this.disposables.push(res);
    return res;
  }

  public createTrackSegment(
    zStart: number,
    options: {
      hasGap?: boolean;
      hasCeilingTrack?: boolean;
      hasIcePatch?: boolean;
      hasGravityPad?: boolean;
    } = {}
  ): { segment: TrackSegment; zones: TrackSpecialZone[] } {
    const world = WORLD_MAP[this.worldId];
    const tex = getWorldTextures(this.worldId, this.maxAnisotropy);
    const group = new THREE.Group();
    const animatedObjects: THREE.Object3D[] = [];
    const zones: TrackSpecialZone[] = [];

    const trackMat = this.track(
      new THREE.MeshStandardMaterial({
        map: tex.trackMap,
        roughness: this.worldId === 'frozen' ? 0.3 : 0.78,
        metalness: this.worldId === 'celestial' ? 0.3 : 0.08,
      })
    );
    const trimMat = this.track(
      new THREE.MeshStandardMaterial({
        color: world.trackTrimColor,
        roughness: 0.55,
        metalness: this.worldId === 'celestial' ? 0.75 : 0.15,
      })
    );
    const pillarMat = this.track(
      new THREE.MeshStandardMaterial({
        map: tex.pillarMap,
        roughness: 0.68,
        metalness: this.worldId === 'celestial' ? 0.45 : 0.12,
      })
    );
    const terrainMat = this.track(
      new THREE.MeshStandardMaterial({
        map: tex.terrainMap,
        roughness: 0.9,
      })
    );

    const hasGap = Boolean(options.hasGap);
    const gapLen = 7.5;
    const gapOffset = SEGMENT_LENGTH * 0.5;
    const gapZStart = zStart - (gapOffset - gapLen / 2);
    const gapZEnd = zStart - (gapOffset + gapLen / 2);

    if (hasGap) {
      const part1Len = gapOffset - gapLen / 2;
      const part2Len = SEGMENT_LENGTH - (gapOffset + gapLen / 2);

      const deck1 = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(TRACK_WIDTH, 1.0, part1Len)),
        trackMat
      );
      deck1.position.set(0, -0.5, zStart - part1Len / 2);
      deck1.receiveShadow = true;
      group.add(deck1);

      const deck2 = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(TRACK_WIDTH, 1.0, part2Len)),
        trackMat
      );
      deck2.position.set(0, -0.5, zStart - SEGMENT_LENGTH + part2Len / 2);
      deck2.receiveShadow = true;
      group.add(deck2);

      // Overhead rope swing arch & glowing hook
      const ropeGroup = new THREE.Group();
      ropeGroup.position.set(0, 4.6, (gapZStart + gapZEnd) / 2);

      const crossbar = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.18, 0.18, TRACK_WIDTH + 2, 8)),
        trimMat
      );
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.y = 1.4;
      ropeGroup.add(crossbar);

      const vine = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6)),
        this.track(new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.8 }))
      );
      vine.position.y = 0.3;
      ropeGroup.add(vine);

      const hookOrb = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.36, 10, 10)),
        this.track(
          new THREE.MeshStandardMaterial({
            color: '#34d399',
            emissive: '#10b981',
            emissiveIntensity: 1.4,
          })
        )
      );
      hookOrb.position.y = -0.8;
      ropeGroup.add(hookOrb);
      group.add(ropeGroup);

      zones.push({
        type: 'gap_rope',
        zStart: gapZStart + 1.2,
        zEnd: gapZEnd - 0.5,
        ropeHook: ropeGroup,
      });
    } else {
      const deck = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(TRACK_WIDTH, 1.0, SEGMENT_LENGTH)),
        trackMat
      );
      deck.position.set(0, -0.5, zStart - SEGMENT_LENGTH / 2);
      deck.receiveShadow = true;
      group.add(deck);
    }

    // Side curbs / bridge rails (elevated slightly to avoid Z-fighting)
    [-TRACK_WIDTH / 2 - 0.35, TRACK_WIDTH / 2 + 0.35].forEach((x) => {
      const rail = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(0.7, 0.45, SEGMENT_LENGTH)),
        trimMat
      );
      rail.position.set(x, 0.22, zStart - SEGMENT_LENGTH / 2);
      rail.receiveShadow = true;
      group.add(rail);
    });

    // Optional Ice Slide Patch (World 3)
    if (options.hasIcePatch && !hasGap) {
      const iceMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#bae6fd',
          emissive: '#0284c7',
          emissiveIntensity: 0.35,
          roughness: 0.08,
          metalness: 0.25,
          transparent: true,
          opacity: 0.85,
        })
      );
      const icePad = new THREE.Mesh(
        this.track(new THREE.PlaneGeometry(TRACK_WIDTH - 0.6, 16)),
        iceMat
      );
      icePad.rotation.x = -Math.PI / 2;
      icePad.position.set(0, 0.03, zStart - SEGMENT_LENGTH / 2);
      group.add(icePad);
      zones.push({
        type: 'ice_patch',
        zStart: zStart - 4,
        zEnd: zStart - 20,
      });
    }

    // Celestial ceiling track & gravity flip sigil (World 5)
    if (options.hasCeilingTrack || this.worldId === 'celestial') {
      const ceilDeck = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(TRACK_WIDTH, 0.7, SEGMENT_LENGTH)),
        trackMat
      );
      ceilDeck.position.set(0, 7.6, zStart - SEGMENT_LENGTH / 2);
      group.add(ceilDeck);

      if (options.hasGravityPad) {
        const padMat = this.track(
          new THREE.MeshStandardMaterial({
            color: '#e879f9',
            emissive: '#d946ef',
            emissiveIntensity: 1.5,
            roughness: 0.2,
          })
        );
        const pad = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.4, 1.4, 0.14, 16)), padMat);
        pad.position.set(0, 0.08, zStart - 8);
        group.add(pad);
        animatedObjects.push(pad);

        const padTop = pad.clone();
        padTop.position.set(0, 7.18, zStart - 20);
        group.add(padTop);

        zones.push({
          type: 'gravity_pad',
          zStart: zStart - 6.5,
          zEnd: zStart - 9.5,
        });
      }
    }

    // Flanking Ground / Abyssal / Sea / Cloud planes so there is never an empty void box
    [-26, 26].forEach((sideX) => {
      if (this.worldId !== 'celestial') {
        const ground = new THREE.Mesh(
          this.track(new THREE.PlaneGeometry(42, SEGMENT_LENGTH)),
          terrainMat
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(sideX, -2.2, zStart - SEGMENT_LENGTH / 2);
        group.add(ground);
      }
    });

    // World-specific 3D flanking architecture
    this.populateWorldScenery(group, zStart, pillarMat, trimMat, animatedObjects);

    return {
      segment: {
        group,
        zStart,
        zEnd: zStart - SEGMENT_LENGTH,
        hasGap,
        gapZStart,
        gapZEnd,
        animatedObjects,
      },
      zones,
    };
  }

  private populateWorldScenery(
    group: THREE.Group,
    zStart: number,
    pillarMat: THREE.Material,
    trimMat: THREE.Material,
    animatedObjects: THREE.Object3D[]
  ): void {
    const zMid = zStart - SEGMENT_LENGTH / 2;

    if (this.worldId === 'jungle') {
      // Mossy carved temple pillars + canopy trees + waterfall cliff
      [-6.8, 6.8].forEach((x, idx) => {
        const pillar = new THREE.Group();
        pillar.position.set(x, 0, zMid + (idx === 0 ? 4 : -4));

        const base = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.7, 0.8, 1.7)), pillarMat);
        base.position.y = 0.4;
        const shaft = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.55, 0.65, 6.2, 8)), pillarMat);
        shaft.position.y = 3.6;
        shaft.castShadow = true;
        const cap = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.9, 0.7, 1.9)), pillarMat);
        cap.position.y = 6.9;
        pillar.add(base, shaft, cap);
        group.add(pillar);

        // Jungle tree behind pillar
        const tree = new THREE.Group();
        tree.position.set(x * 1.9, -1.8, zMid - 5 + idx * 8);
        const trunk = new THREE.Mesh(
          this.track(new THREE.CylinderGeometry(0.45, 0.7, 9, 7)),
          this.track(new THREE.MeshStandardMaterial({ color: '#4a3525', roughness: 0.9 }))
        );
        trunk.position.y = 4.5;
        const foliageMat = this.track(
          new THREE.MeshStandardMaterial({ color: '#27592d', roughness: 0.85 })
        );
        const crown1 = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(3.2, 0)), foliageMat);
        crown1.position.set(0, 9.2, 0);
        const crown2 = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(2.4, 0)), foliageMat);
        crown2.position.set(idx === 0 ? 1.5 : -1.5, 8.1, 0.6);
        tree.add(trunk, crown1, crown2);
        group.add(tree);
      });

      // Waterfall cliff on the left side every segment
      const cliff = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(7, 12, 10)),
        this.track(new THREE.MeshStandardMaterial({ color: '#3b4236', roughness: 0.92 }))
      );
      cliff.position.set(-20, 4, zMid);
      group.add(cliff);

      const waterfall = new THREE.Mesh(
        this.track(new THREE.PlaneGeometry(3.4, 11)),
        this.track(
          new THREE.MeshStandardMaterial({
            color: '#a5f3fc',
            emissive: '#0891b2',
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.75,
            roughness: 0.2,
          })
        )
      );
      waterfall.position.set(-16.4, 3.8, zMid);
      waterfall.rotation.y = Math.PI / 2;
      group.add(waterfall);
      animatedObjects.push(waterfall);
    } else if (this.worldId === 'desert') {
      // Towering Pyramids, sandstone obelisks & rolling dunes
      const sandMat = this.track(new THREE.MeshStandardMaterial({ color: '#d49a56', roughness: 0.92 }));
      [-14, 14].forEach((x, idx) => {
        const dune = new THREE.Mesh(this.track(new THREE.ConeGeometry(8.5, 5.2, 5)), sandMat);
        dune.position.set(x * 1.4, 0.3, zMid + (idx === 0 ? -3 : 5));
        dune.scale.set(1.3, 0.8, 1.8);
        group.add(dune);

        // Sandstone Obelisk
        const obelisk = new THREE.Group();
        obelisk.position.set(x * 0.56, 0, zMid + (idx === 0 ? 6 : -6));
        const body = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.55, 0.9, 6.5, 4)), pillarMat);
        body.position.y = 3.25;
        body.rotation.y = Math.PI / 4;
        const tip = new THREE.Mesh(
          this.track(new THREE.ConeGeometry(0.55, 1.1, 4)),
          this.track(new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.22 }))
        );
        tip.position.y = 7.05;
        tip.rotation.y = Math.PI / 4;
        obelisk.add(body, tip);
        group.add(obelisk);
      });

      // Great Pyramid silhouette on flank
      const pyramid = new THREE.Mesh(this.track(new THREE.ConeGeometry(14, 16, 4)), pillarMat);
      pyramid.rotation.y = Math.PI / 4;
      pyramid.position.set(-28, 5.5, zMid);
      group.add(pyramid);
    } else if (this.worldId === 'frozen') {
      // Obsidian-blue Ice Citadel arches + glowing cyan crystal spires + snow mountains
      const iceCrystalMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#0284c7',
          emissiveIntensity: 0.9,
          roughness: 0.15,
          metalness: 0.3,
        })
      );
      const snowPeakMat = this.track(new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.85 }));

      // Gothic Ice Arch spanning over track
      const arch = new THREE.Group();
      arch.position.set(0, 0, zMid);
      [-5.8, 5.8].forEach((x) => {
        const spire = new THREE.Mesh(this.track(new THREE.ConeGeometry(1.1, 9.5, 6)), pillarMat);
        spire.position.set(x, 4.7, 0);
        arch.add(spire);

        const crystal = new THREE.Mesh(this.track(new THREE.OctahedronGeometry(0.75, 0)), iceCrystalMat);
        crystal.position.set(x * 0.95, 2.4, 0);
        crystal.scale.set(0.7, 1.8, 0.7);
        arch.add(crystal);
      });
      const beam = new THREE.Mesh(this.track(new THREE.BoxGeometry(12.2, 0.9, 1.1)), pillarMat);
      beam.position.set(0, 7.2, 0);
      arch.add(beam);
      group.add(arch);

      [-22, 22].forEach((x, i) => {
        const peak = new THREE.Mesh(this.track(new THREE.ConeGeometry(10, 18, 5)), snowPeakMat);
        peak.position.set(x, 6.5, zMid + (i === 0 ? -4 : 4));
        group.add(peak);
      });
    } else if (this.worldId === 'sunken') {
      // Coral-covered stone arches, bioluminescent corals, swimming manta rays
      const coralMatA = this.track(
        new THREE.MeshStandardMaterial({
          color: '#fb923c',
          emissive: '#ea580c',
          emissiveIntensity: 0.5,
          roughness: 0.5,
        })
      );
      const coralMatB = this.track(
        new THREE.MeshStandardMaterial({
          color: '#2dd4bf',
          emissive: '#0d9488',
          emissiveIntensity: 0.75,
          roughness: 0.4,
        })
      );

      // Sunken Archway
      const archRing = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(6.2, 0.72, 8, 20, Math.PI)),
        pillarMat
      );
      archRing.position.set(0, 0.4, zMid);
      group.add(archRing);

      [-6.5, 6.5].forEach((x, idx) => {
        const coral = new THREE.Mesh(
          this.track(new THREE.DodecahedronGeometry(1.1, 0)),
          idx === 0 ? coralMatA : coralMatB
        );
        coral.position.set(x, 0.6, zMid + 5);
        coral.scale.set(1, 1.6, 1);
        group.add(coral);

        // Submerged ruin tower
        const tower = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.4, 1.8, 10, 8)), pillarMat);
        tower.position.set(x * 2.2, 2.5, zMid - 3);
        group.add(tower);
      });

      // Swimming Manta Ray silhouette
      const manta = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(1.4, 2.4, 3)),
        this.track(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 }))
      );
      manta.rotation.x = Math.PI / 2;
      manta.scale.set(1.8, 1, 0.25);
      manta.position.set(-7, 6.5, zMid);
      group.add(manta);
      animatedObjects.push(manta);
    } else {
      // Celestial Temple: Floating flower-rimmed islands, golden domed pavilions, orb pillars
      const goldMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: '#b45309',
          emissiveIntensity: 0.35,
          metalness: 0.88,
          roughness: 0.2,
        })
      );
      const domeMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#0ea5e9',
          metalness: 0.55,
          roughness: 0.25,
        })
      );
      const orbMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#fef08a',
          emissive: '#f59e0b',
          emissiveIntensity: 1.5,
        })
      );

      [-6.2, 6.2].forEach((x, idx) => {
        // Golden lantern pillar along bridge edge
        const lamp = new THREE.Group();
        lamp.position.set(x, 0, zMid + (idx === 0 ? 5 : -5));
        const col = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.28, 0.42, 2.8, 8)), goldMat);
        col.position.y = 1.4;
        const orb = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.42, 10, 10)), orbMat);
        orb.position.y = 3.1;
        lamp.add(col, orb);
        group.add(lamp);

        // Floating Pavilion Island in the flanks
        const island = new THREE.Group();
        island.position.set(x * 2.5, 1.5 + idx * 1.4, zMid);
        const rock = new THREE.Mesh(this.track(new THREE.ConeGeometry(4.5, 5.5, 7)), trimMat);
        rock.rotation.x = Math.PI;
        rock.position.y = -2.6;
        const hall = new THREE.Mesh(this.track(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 8)), goldMat);
        hall.position.y = 1.6;
        const dome = new THREE.Mesh(
          this.track(new THREE.SphereGeometry(2.3, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
          domeMat
        );
        dome.position.y = 3.2;
        island.add(rock, hall, dome);
        group.add(island);
        animatedObjects.push(island);
      });
    }
  }

  public createObstacle(kind: ObstacleKind, lane: number, z: number, inverted = false): SpawnedObstacle {
    const group = new THREE.Group();
    const x = LANES[lane];
    let width = 1.85;
    let height = 1.25;
    let yBase = 0;
    let speedOffset = 0;
    let animatedPart: THREE.Object3D | undefined;

    const rockMat = this.track(new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.85 }));
    const woodMat = this.track(new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.88 }));
    const hazardMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#b91c1c',
        emissiveIntensity: 0.5,
        roughness: 0.35,
      })
    );

    if (kind === 'low_barrier') {
      // Fallen trunk or stone chest-high wall -> Jump over
      width = 2.0;
      height = 1.15;
      if (this.worldId === 'jungle') {
        const log = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.48, 0.52, 2.2, 10)), woodMat);
        log.rotation.z = Math.PI / 2;
        log.position.y = 0.52;
        log.castShadow = true;
        group.add(log);
      } else {
        const wall = new THREE.Mesh(
          this.track(new THREE.BoxGeometry(2.1, 1.05, 0.7)),
          this.worldId === 'frozen'
            ? this.track(new THREE.MeshStandardMaterial({ color: '#7dd3fc', roughness: 0.2 }))
            : rockMat
        );
        wall.position.y = 0.52;
        wall.castShadow = true;
        group.add(wall);
      }
    } else if (kind === 'high_beam') {
      // Overhead swinging vine log / stone lintel / coral gate -> Slide under
      width = 2.2;
      height = 1.5;
      yBase = 1.15; // Player stands at 1.75m, slides to 0.75m
      const postMat = rockMat;
      [-1.05, 1.05].forEach((px) => {
        const post = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.25, 2.8, 0.25)), postMat);
        post.position.set(px, 1.4, 0);
        group.add(post);
      });
      const beam = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.4, 0.75, 0.55)), hazardMat);
      beam.position.y = 1.65;
      beam.castShadow = true;
      group.add(beam);
    } else if (kind === 'full_pillar' || kind === 'ice_wall') {
      width = 1.9;
      height = 3.2;
      const mat =
        kind === 'ice_wall'
          ? this.track(
              new THREE.MeshStandardMaterial({
                color: '#38bdf8',
                emissive: '#0369a1',
                emissiveIntensity: 0.45,
                roughness: 0.15,
              })
            )
          : rockMat;
      const block = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.95, 3.2, 1.2)), mat);
      block.position.y = 1.6;
      block.castShadow = true;
      group.add(block);
    } else if (kind === 'rolling_boulder') {
      width = 1.8;
      height = 1.8;
      speedOffset = 5.5; // rolls toward explorer
      const sphere = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(0.95, 1)), rockMat);
      sphere.position.y = 0.95;
      sphere.castShadow = true;
      group.add(sphere);
      animatedPart = sphere;
    } else if (kind === 'quicksand') {
      width = 2.2;
      height = 0.45;
      const pool = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 14)),
        this.track(new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.95 }))
      );
      pool.position.y = 0.06;
      group.add(pool);
    } else if (kind === 'sand_geyser') {
      width = 1.8;
      height = 2.8;
      const cone = new THREE.Mesh(
        this.track(new THREE.ConeGeometry(0.85, 3.0, 10)),
        this.track(
          new THREE.MeshStandardMaterial({
            color: '#f59e0b',
            emissive: '#b45309',
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.82,
          })
        )
      );
      cone.position.y = 1.5;
      group.add(cone);
      animatedPart = cone;
    } else if (kind === 'electric_barrier' || kind === 'energy_barrier') {
      width = 2.1;
      height = 1.15;
      const color = kind === 'electric_barrier' ? '#22d3ee' : '#e879f9';
      const barMat = this.track(
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.4,
          roughness: 0.15,
        })
      );
      const bar = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 10)), barMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.y = 0.65;
      group.add(bar);
      animatedPart = bar;
    } else if (kind === 'sea_creature') {
      width = 1.7;
      height = 2.1;
      const creatureMat = this.track(
        new THREE.MeshStandardMaterial({
          color: '#0f766e',
          emissive: '#2dd4bf',
          emissiveIntensity: 0.45,
          roughness: 0.35,
        })
      );
      const body = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.7, 10, 10)), creatureMat);
      body.position.y = 1.25;
      body.scale.set(0.8, 0.8, 1.5);
      group.add(body);
      animatedPart = body;
    }

    if (inverted) {
      group.rotation.x = Math.PI;
      group.position.set(x, 7.25, z);
    } else {
      group.position.set(x, 0, z);
    }

    return {
      mesh: group,
      kind,
      lane,
      z,
      width,
      height,
      yBase,
      inverted,
      speedOffset,
      cleared: false,
      animatedPart,
    };
  }

  public createCollectible(
    kind: CollectibleKind,
    lane: number,
    z: number,
    y = 0.85
  ): SpawnedCollectible {
    const group = new THREE.Group();
    const x = LANES[lane];

    if (kind === 'coin') {
      const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
      group.add(coin);
    } else if (kind === 'gem') {
      const gem = new THREE.Mesh(this.gemGeo, this.gemMat);
      group.add(gem);
    } else if (kind === 'clue') {
      const scroll = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.18, 0.18, 0.72, 10)),
        this.clueMat
      );
      scroll.rotation.z = Math.PI / 4;
      group.add(scroll);
      const ring = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(0.55, 0.05, 8, 16)),
        this.clueMat
      );
      group.add(ring);
    } else if (kind === 'oxygen') {
      const bubble = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.52, 12, 12)), this.oxygenMat);
      group.add(bubble);
    } else {
      // Secret Treasure Room Portal
      const ring = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(1.15, 0.16, 10, 24)),
        this.portalMat
      );
      ring.position.y = 0.65;
      group.add(ring);
      const inner = new THREE.Mesh(
        this.track(new THREE.CircleGeometry(1.0, 18)),
        this.track(
          new THREE.MeshBasicMaterial({
            color: '#fef08a',
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
          })
        )
      );
      inner.position.y = 0.65;
      group.add(inner);
    }

    group.position.set(x, y, z);
    return {
      mesh: group,
      kind,
      lane,
      z,
      y,
      collected: false,
    };
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
