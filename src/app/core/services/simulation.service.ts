import { Injectable, signal } from '@angular/core';
import { SimulationMode, MetalType, SIM_CONSTANTS } from '../../shared/models/simulation.types';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  readonly mode = signal<SimulationMode>('metal');
  readonly metalType = signal<MetalType>('silver');
  readonly showElectrons = signal<boolean>(true);
  readonly latticeHeat = signal<number>(0);
  readonly surfaceExcited = signal<number>(0);
  readonly statusMessage = signal<string>('視点をドラッグで回転できます。光を当ててみましょう。');

  setMode(mode: SimulationMode) {
    this.mode.set(mode);
    this.latticeHeat.set(0);
    this.surfaceExcited.set(0);
    
    if (mode === 'metal') {
      this.statusMessage.set("金属モード：自由電子と光の相互作用をシミュレートします。");
    } else {
      this.statusMessage.set("非金属モード：赤い光と青い光で、熱エネルギーへの変換効率の違いを実験できます。");
    }
  }

  setMetalType(type: MetalType) {
    this.metalType.set(type);
  }

  toggleElectrons(show: boolean) {
    this.showElectrons.set(show);
  }

  updateLatticeHeat(delta: number) {
    this.latticeHeat.update(h => Math.min(1.0, Math.max(0, h + delta)));
  }

  updateSurfaceExcited(delta: number) {
    this.surfaceExcited.update(s => Math.max(0, s + delta));
  }

  setSurfaceExcited(val: number) {
    this.surfaceExcited.set(val);
  }

  setStatus(message: string) {
    this.statusMessage.set(message);
  }
}
