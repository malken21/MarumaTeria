import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { SimulationService } from './simulation.service';
import { SIM_CONSTANTS, Electron, Photon, MetalType } from '../../shared/models/simulation.types';

@Injectable({
  providedIn: 'root'
})
export class SimulationRendererService {
  private scene!: THREE.Scene;
  private ionsMesh!: THREE.InstancedMesh;
  private electronsMesh!: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  
  private electronData: Electron[] = [];
  private ionPositions: {x: number, y: number, z: number}[] = [];
  private photons: Photon[] = [];
  private totalIons = 0;

  private readonly baseEmissiveColor = new THREE.Color(0x222222);
  private readonly hotEmissiveColor = new THREE.Color(0xcc2211);
  private currentEmissiveColor = new THREE.Color();

  constructor(private simService: SimulationService) {}

  init(scene: THREE.Scene) {
    this.scene = scene;
    this.createMetalStructure();
  }

  private createMetalStructure() {
    const { METAL_WIDTH, METAL_HEIGHT, METAL_DEPTH, ELECTRON_COUNT, ION_SPACING } = SIM_CONSTANTS;

    // Metal Box wireframe
    const boxGeo = new THREE.BoxGeometry(METAL_WIDTH, METAL_HEIGHT, METAL_DEPTH);
    const boxMat = new THREE.MeshBasicMaterial({ 
      color: 0x334455, wireframe: true, transparent: true, opacity: 0.1 
    });
    const metalBox = new THREE.Mesh(boxGeo, boxMat);
    this.scene.add(metalBox);

    // Ions
    const ionGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const ionMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      roughness: 0.4, 
      metalness: 0.1,
      emissive: 0x222222 
    });
    
    const cols = Math.floor(METAL_WIDTH / ION_SPACING);
    const rows = Math.floor(METAL_HEIGHT / ION_SPACING);
    const depths = Math.floor(METAL_DEPTH / ION_SPACING);
    this.totalIons = cols * rows * depths;
    
    this.ionsMesh = new THREE.InstancedMesh(ionGeo, ionMat, this.totalIons);
    this.ionsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    let i = 0;
    const startX = -((cols-1)*ION_SPACING)/2;
    const startY = -((rows-1)*ION_SPACING)/2;
    const startZ = -((depths-1)*ION_SPACING)/2;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        for (let z = 0; z < depths; z++) {
          const px = startX + x * ION_SPACING;
          const py = startY + y * ION_SPACING;
          const pz = startZ + z * ION_SPACING;
          this.ionPositions.push({x: px, y: py, z: pz}); 
          this.dummy.position.set(px, py, pz);
          this.dummy.updateMatrix();
          this.ionsMesh.setMatrixAt(i++, this.dummy.matrix);
        }
      }
    }
    this.scene.add(this.ionsMesh);

    // Electrons
    const electronGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const electronMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); 
    this.electronsMesh = new THREE.InstancedMesh(electronGeo, electronMat, ELECTRON_COUNT);
    this.electronsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      const px = (Math.random() - 0.5) * METAL_WIDTH;
      const py = (Math.random() - 0.5) * METAL_HEIGHT;
      const pz = (Math.random() - 0.5) * METAL_DEPTH;
      const speed = 0.1;
      const vx = (Math.random() - 0.5) * speed;
      const vy = (Math.random() - 0.5) * speed;
      const vz = (Math.random() - 0.5) * speed;
      
      this.electronData.push({ x: px, y: py, z: pz, vx: vx, vy: vy, vz: vz });
      this.dummy.position.set(px, py, pz);
      this.dummy.updateMatrix();
      this.electronsMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.scene.add(this.electronsMesh);
  }

  update() {
    this.updateIons();
    this.updateElectrons();
    this.updatePhotons();
  }

  private updateIons() {
    const latticeHeat = this.simService.latticeHeat();
    this.simService.updateLatticeHeat(-0.003);

    this.currentEmissiveColor.copy(this.baseEmissiveColor).lerp(this.hotEmissiveColor, latticeHeat);
    (this.ionsMesh.material as THREE.MeshStandardMaterial).emissive.copy(this.currentEmissiveColor);

    const mode = this.simService.mode();
    if (mode === 'metal') {
      (this.ionsMesh.material as THREE.MeshStandardMaterial).color.setHex(0x888888);
    } else {
      (this.ionsMesh.material as THREE.MeshStandardMaterial).color.setHex(0x8b5a2b);
    }

    const jiggleAmt = latticeHeat * 0.4; 
    for (let i = 0; i < this.totalIons; i++) {
      const basePos = this.ionPositions[i];
      const jiggleX = jiggleAmt > 0 ? (Math.random() - 0.5) * jiggleAmt : 0;
      const jiggleY = jiggleAmt > 0 ? (Math.random() - 0.5) * jiggleAmt : 0;
      const jiggleZ = jiggleAmt > 0 ? (Math.random() - 0.5) * jiggleAmt : 0;
      
      this.dummy.position.set(basePos.x + jiggleX, basePos.y + jiggleY, basePos.z + jiggleZ);
      this.dummy.updateMatrix();
      this.ionsMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.ionsMesh.instanceMatrix.needsUpdate = true;
  }

  private updateElectrons() {
    this.simService.updateSurfaceExcited(-0.02);
    const surfaceExcited = this.simService.surfaceExcited();
    const mode = this.simService.mode();
    const showElectrons = this.simService.showElectrons();

    this.electronsMesh.visible = (mode === 'metal' && showElectrons);
    if (this.electronsMesh.visible) {
      const { METAL_WIDTH, METAL_HEIGHT, METAL_DEPTH, ELECTRON_COUNT } = SIM_CONSTANTS;
      for (let i = 0; i < ELECTRON_COUNT; i++) {
        const ed = this.electronData[i];
        ed.x += ed.vx; ed.y += ed.vy; ed.z += ed.vz;
        
        let jiggleX = 0, jiggleY = 0, jiggleZ = 0;
        if (ed.y > METAL_HEIGHT/2 - 1.5 && surfaceExcited > 0) {
          const intensity = surfaceExcited * 0.4;
          jiggleX = (Math.random() - 0.5) * intensity;
          jiggleY = (Math.random() - 0.5) * intensity;
          jiggleZ = (Math.random() - 0.5) * intensity;
        }

        const halfW = METAL_WIDTH / 2;
        const halfH = METAL_HEIGHT / 2;
        const halfD = METAL_DEPTH / 2;

        if (ed.x > halfW || ed.x < -halfW) ed.vx *= -1;
        if (ed.y > halfH || ed.y < -halfH) ed.vy *= -1;
        if (ed.z > halfD || ed.z < -halfD) ed.vz *= -1;

        ed.x = Math.max(-halfW, Math.min(halfW, ed.x));
        ed.y = Math.max(-halfH, Math.min(halfH, ed.y));
        ed.z = Math.max(-halfD, Math.min(halfD, ed.z));

        this.dummy.position.set(ed.x + jiggleX, ed.y + jiggleY, ed.z + jiggleZ);
        this.dummy.updateMatrix();
        this.electronsMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.electronsMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updatePhotons() {
    for (let i = this.photons.length - 1; i >= 0; i--) {
      const p = this.photons[i];
      if (p.state === 'incoming') {
        p.mesh.position.x += 0.3; p.mesh.position.y -= 0.4; 
        if (p.mesh.position.y <= p.targetY) {
          if (p.isMetalMode) {
            this.simService.setSurfaceExcited(1.0);
            let willReflect = true;
            if (p.metalType === 'gold' && p.colorId === 'B') willReflect = false;
            else if (p.metalType === 'copper' && (p.colorId === 'B' || p.colorId === 'G')) willReflect = false;

            if (willReflect) {
              p.state = 'reflecting';
              p.mesh.scale.set(1.5, 1.5, 1.5);
            } else {
              p.state = 'absorbing';
              (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
            }
          } else {
            p.state = 'absorbing';
          }
        }
      } else if (p.state === 'reflecting') {
        p.mesh.position.x += 0.3; p.mesh.position.y += 0.4; 
        if (p.colorId === 'R') p.mesh.position.z += 0.02;
        if (p.colorId === 'B') p.mesh.position.z -= 0.02;
        if (p.mesh.position.y > 30) this.disposePhoton(i);
      } else if (p.state === 'absorbing') {
        p.mesh.position.x += 0.15; p.mesh.position.y -= 0.2; 
        p.mesh.scale.multiplyScalar(0.85);
        if (p.mesh.scale.x < 0.1) {
          let heatAmount = 0.02;
          if (p.colorId === 'B') heatAmount = 0.08;
          else if (p.colorId === 'G') heatAmount = 0.05;
          this.simService.updateLatticeHeat(heatAmount);
          this.disposePhoton(i);
        }
      }
    }
  }

  shootLight(type: MetalType) {
    if (this.photons.length > 80) return; 

    const { METAL_HEIGHT } = SIM_CONSTANTS;
    const currentMode = this.simService.mode();

    let text = "";
    let colorsToShoot: { id: 'R' | 'G' | 'B', hex: number, offsetX: number, offsetZ: number }[] = [];
    const colorDataAll: { id: 'R' | 'G' | 'B', hex: number, offsetX: number, offsetZ: number }[] = [
      { id: 'R', hex: 0xff0000, offsetX: -0.15, offsetZ: -0.1 },
      { id: 'G', hex: 0x00ff00, offsetX: 0.15, offsetZ: -0.1 },
      { id: 'B', hex: 0x0000ff, offsetX: 0, offsetZ: 0.15 }
    ];

    if (currentMode === 'metal') {
      colorsToShoot = colorDataAll;
      if (type === 'silver') text = "銀：自由電子が赤・緑・青すべての波長をそのまま再放出（反射）します。";
      else if (type === 'gold') text = "金：青い光（高エネルギー）を吸収し、格子の熱として蓄積されます。";
      else if (type === 'copper') text = "銅：青・緑を吸収し、格子の熱として蓄積します。";
    } else {
      if (type === 'nonmetal-red') {
        colorsToShoot = [colorDataAll[0]];
        text = "赤い光（長波長）：エネルギーが低いため、吸収されても温度上昇は緩やかです。";
      } else if (type === 'nonmetal-blue') {
        colorsToShoot = [colorDataAll[2]];
        text = "青い光（短波長）：エネルギーが高いため、吸収されると一気に激しく原子を振動させます。";
      } else {
        colorsToShoot = colorDataAll;
        text = "非金属：すべての光が吸収され、熱エネルギーに変換されます。";
      }
    }
    this.simService.setStatus(text);
    
    for(let i=0; i<4; i++) {
      setTimeout(() => {
        const baseX = -10 + Math.random()*5;
        const baseY = 15 + Math.random()*2;
        const baseZ = (Math.random()-0.5)*10;
        colorsToShoot.forEach(cData => {
          const photonMat = new THREE.MeshBasicMaterial({ 
            color: cData.hex, transparent: true, opacity: 1.0,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          const photonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), photonMat);
          photonMesh.position.set(baseX + cData.offsetX, baseY, baseZ + cData.offsetZ);
          this.scene.add(photonMesh);
          this.photons.push({
            mesh: photonMesh, state: 'incoming', targetY: METAL_HEIGHT/2, 
            metalType: type, colorId: cData.id, isMetalMode: currentMode === 'metal'
          });
        });
      }, i * 200);
    }
  }

  private disposePhoton(index: number) {
    const p = this.photons[index];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    (p.mesh.material as THREE.Material).dispose();
    this.photons.splice(index, 1);
  }

  clearPhotons() {
    for (let i = this.photons.length - 1; i >= 0; i--) {
      this.disposePhoton(i);
    }
  }
}
