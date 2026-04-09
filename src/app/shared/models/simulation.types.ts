import * as THREE from 'three';

export type SimulationMode = 'metal' | 'nonmetal';


export type MetalType = 'silver' | 'gold' | 'copper' | 'nonmetal' | 'nonmetal-red' | 'nonmetal-blue';

export interface Electron {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface Photon {
  mesh: THREE.Mesh;
  state: 'incoming' | 'reflecting' | 'absorbing';
  targetY: number;
  metalType: MetalType;
  colorId: 'R' | 'G' | 'B';
  isMetalMode: boolean;
}

export const SIM_CONSTANTS = {
  METAL_WIDTH: 20,
  METAL_HEIGHT: 6,
  METAL_DEPTH: 15,
  ELECTRON_COUNT: 400,
  ION_SPACING: 3.5,
};
