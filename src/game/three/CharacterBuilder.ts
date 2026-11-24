import * as THREE from 'three';
import { COSMETICS_LIST } from '../../data/catalog';
import { EquippedCosmetics } from '../../types/game';
import { getContactShadowTexture } from './textures';

export interface ExplorerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  capeMesh: THREE.Mesh | null;
  shieldBubble: THREE.Mesh;
  bootsGlowLeft: THREE.Mesh;
  bootsGlowRight: THREE.Mesh;
  contactShadow: THREE.Mesh;
  dispose: () => void;
}

export function buildExplorerCharacter(
  cosmetics: EquippedCosmetics,
  isRival = false
): ExplorerRig {
  const outfit =
    COSMETICS_LIST.find((c) => c.id === cosmetics.outfit) ??
    COSMETICS_LIST.find((c) => c.id === 'outfit_classic')!;
  const hat =
    COSMETICS_LIST.find((c) => c.id === cosmetics.hat) ??
    COSMETICS_LIST.find((c) => c.id === 'hat_fedora')!;
  const pack =
    COSMETICS_LIST.find((c) => c.id === cosmetics.backpack) ??
    COSMETICS_LIST.find((c) => c.id === 'pack_canvas')!;
  const accessory =
    COSMETICS_LIST.find((c) => c.id === cosmetics.accessory) ??
    COSMETICS_LIST.find((c) => c.id === 'acc_none')!;

  const primaryCol = isRival ? '#2b193d' : outfit.primaryColor;
  const secondaryCol = isRival ? '#120a1c' : outfit.secondaryColor;
  const accentCol = isRival ? '#c084fc' : outfit.accentColor;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Materials (varied roughness >= 0.25 between skin, fabric, leather, metal)
  const skinMat = track(
    new THREE.MeshStandardMaterial({
      color: isRival ? '#a78bfa' : '#e0ac84',
      roughness: 0.72,
      metalness: 0.02,
    })
  );
  const jacketMat = track(
    new THREE.MeshStandardMaterial({
      color: primaryCol,
      roughness: 0.82,
      metalness: 0.05,
    })
  );
  const pantsMat = track(
    new THREE.MeshStandardMaterial({
      color: secondaryCol,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const metalMat = track(
    new THREE.MeshStandardMaterial({
      color: accentCol,
      roughness: 0.24,
      metalness: 0.88,
    })
  );
  const bootMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2b1d14',
      roughness: 0.55,
      metalness: 0.12,
    })
  );

  // Contact shadow grounded at y = 0.02
  const shadowGeo = track(new THREE.PlaneGeometry(1.35, 1.35));
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  // Legs (pivot at hip y = 0.78)
  const makeLeg = (xOffset: number): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.78, 0);

    const thigh = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.11, 0.26, 4, 8)), pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const shin = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.09, 0.24, 4, 8)), pantsMat);
    shin.position.y = -0.5;
    shin.castShadow = true;
    legGroup.add(shin);

    const boot = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.16, 0.34)), bootMat);
    boot.position.set(0, -0.7, -0.05);
    boot.castShadow = true;
    legGroup.add(boot);

    return legGroup;
  };

  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  bodyPivot.add(leftLeg, rightLeg);

  // Power Boots glow soles
  const bootGlowGeo = track(new THREE.BoxGeometry(0.26, 0.08, 0.38));
  const bootGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 1.6,
      roughness: 0.2,
    })
  );
  const bootsGlowLeft = new THREE.Mesh(bootGlowGeo, bootGlowMat);
  bootsGlowLeft.position.set(0, -0.76, -0.05);
  bootsGlowLeft.visible = false;
  leftLeg.add(bootsGlowLeft);

  const bootsGlowRight = new THREE.Mesh(bootGlowGeo, bootGlowMat);
  bootsGlowRight.position.set(0, -0.76, -0.05);
  bootsGlowRight.visible = false;
  rightLeg.add(bootsGlowRight);

  // Torso (hips at y = 0.78 -> top at y = 1.48)
  const torso = new THREE.Group();
  torso.position.set(0, 0.82, 0);
  bodyPivot.add(torso);

  const chest = new THREE.Mesh(track(new THREE.CylinderGeometry(0.26, 0.22, 0.64, 10)), jacketMat);
  chest.position.y = 0.32;
  chest.castShadow = true;
  torso.add(chest);

  const belt = new THREE.Mesh(track(new THREE.CylinderGeometry(0.245, 0.245, 0.1, 10)), bootMat);
  belt.position.y = 0.05;
  torso.add(belt);

  const buckle = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.09, 0.06)), metalMat);
  buckle.position.set(0, 0.05, -0.23);
  torso.add(buckle);

  // Sash / strap across chest
  const strap = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.62, 0.48)), metalMat);
  strap.position.set(0.04, 0.33, 0);
  strap.rotation.z = 0.48;
  torso.add(strap);

  // Backpack
  const packGroup = new THREE.Group();
  packGroup.position.set(0, 0.34, 0.26);
  torso.add(packGroup);

  const packMat = track(
    new THREE.MeshStandardMaterial({
      color: pack.primaryColor,
      roughness: 0.7,
      metalness: 0.2,
    })
  );
  const packAccentMat = track(
    new THREE.MeshStandardMaterial({
      color: pack.accentColor,
      emissive: pack.id === 'pack_thruster' || pack.id === 'pack_wings' ? pack.accentColor : '#000000',
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.7,
    })
  );

  const packBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 0.44, 0.2)), packMat);
  packBody.castShadow = true;
  packGroup.add(packBody);

  if (pack.id === 'pack_thruster') {
    [-0.12, 0.12].forEach((x) => {
      const nozzle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.08, 0.32, 8)), packAccentMat);
      nozzle.position.set(x, -0.06, 0.12);
      packGroup.add(nozzle);
    });
  } else if (pack.id === 'pack_wings') {
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.22, 0.04)), packAccentMat);
      wing.position.set(side * 0.38, 0.12, 0.08);
      wing.rotation.z = side * 0.35;
      wing.rotation.y = side * -0.25;
      packGroup.add(wing);
    });
  } else {
    const roll = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 0.38, 8)), packAccentMat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.25, 0);
    packGroup.add(roll);
  }

  // Accessory (Scarf / Cape)
  let capeMesh: THREE.Mesh | null = null;
  if (accessory.id === 'acc_scarf' || accessory.id === 'acc_cape' || isRival) {
    const capeColor = isRival ? '#7e22ce' : accessory.primaryColor;
    const capeMat = track(
      new THREE.MeshStandardMaterial({
        color: capeColor,
        roughness: 0.85,
        side: THREE.DoubleSide,
      })
    );
    const width = accessory.id === 'acc_cape' || isRival ? 0.56 : 0.22;
    const length = accessory.id === 'acc_cape' || isRival ? 0.95 : 0.65;
    const capeGeo = track(new THREE.PlaneGeometry(width, length));
    capeGeo.translate(0, -length / 2, 0);
    capeMesh = new THREE.Mesh(capeGeo, capeMat);
    capeMesh.position.set(0, 0.6, 0.22);
    capeMesh.rotation.x = 0.35;
    torso.add(capeMesh);
  }

  // Arms
  const makeArm = (xOffset: number): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOffset, 0.58, 0);

    const sleeve = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.085, 0.28, 4, 8)), jacketMat);
    sleeve.position.y = -0.18;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const hand = new THREE.Mesh(track(new THREE.SphereGeometry(0.085, 8, 8)), skinMat);
    hand.position.y = -0.4;
    armGroup.add(hand);

    return armGroup;
  };
  const leftArm = makeArm(-0.33);
  const rightArm = makeArm(0.33);
  torso.add(leftArm, rightArm);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 0.72, 0);
  torso.add(head);

  const skull = new THREE.Mesh(track(new THREE.SphereGeometry(0.21, 14, 12)), skinMat);
  skull.position.y = 0.14;
  skull.castShadow = true;
  head.add(skull);

  // Eyes (facing -Z forward direction)
  const eyeMat = track(
    new THREE.MeshStandardMaterial({
      color: isRival ? '#e879f9' : '#111827',
      emissive: isRival ? '#e879f9' : '#000000',
      emissiveIntensity: isRival ? 1.4 : 0,
      roughness: 0.2,
    })
  );
  [-0.075, 0.075].forEach((x) => {
    const eye = new THREE.Mesh(track(new THREE.SphereGeometry(0.032, 6, 6)), eyeMat);
    eye.position.set(x, 0.16, -0.19);
    head.add(eye);
  });

  // Hat / Helmet
  const hatPrimaryMat = track(
    new THREE.MeshStandardMaterial({
      color: isRival ? '#4c1d95' : hat.primaryColor,
      roughness: 0.65,
      metalness: 0.25,
    })
  );
  const hatAccentMat = track(
    new THREE.MeshStandardMaterial({
      color: isRival ? '#f0abfc' : hat.accentColor,
      emissive: hat.id === 'hat_astral_halo' ? '#fbbf24' : '#000000',
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8,
    })
  );

  if (hat.id === 'hat_astral_halo') {
    const halo = new THREE.Mesh(track(new THREE.TorusGeometry(0.24, 0.035, 8, 24)), hatAccentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.42;
    head.add(halo);
  } else if (hat.id === 'hat_dive_helm') {
    const dome = new THREE.Mesh(track(new THREE.SphereGeometry(0.26, 14, 12)), hatPrimaryMat);
    dome.position.y = 0.16;
    head.add(dome);
    const visor = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12)),
      hatAccentMat
    );
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.16, -0.23);
    head.add(visor);
  } else if (hat.id === 'hat_temple_crown') {
    const band = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 12)), hatAccentMat);
    band.position.y = 0.27;
    head.add(band);
    const gem = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.06, 0)), hatPrimaryMat);
    gem.position.set(0, 0.3, -0.22);
    head.add(gem);
  } else {
    // Wide-brimmed adventurer hat / hood
    const brim = new THREE.Mesh(track(new THREE.CylinderGeometry(0.36, 0.38, 0.04, 14)), hatPrimaryMat);
    brim.position.y = 0.3;
    brim.castShadow = true;
    head.add(brim);

    const crown = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.21, 0.2, 12)), hatPrimaryMat);
    crown.position.y = 0.4;
    head.add(crown);

    const band = new THREE.Mesh(track(new THREE.CylinderGeometry(0.212, 0.215, 0.045, 12)), hatAccentMat);
    band.position.y = 0.33;
    head.add(band);
  }

  // Protective Shield Bubble
  const shieldGeo = track(new THREE.SphereGeometry(0.98, 20, 16));
  const shieldMat = track(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      roughness: 0.1,
      metalness: 0.2,
    })
  );
  const shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
  shieldBubble.position.y = 0.95;
  shieldBubble.visible = false;
  root.add(shieldBubble);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    capeMesh,
    shieldBubble,
    bootsGlowLeft,
    bootsGlowRight,
    contactShadow,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
