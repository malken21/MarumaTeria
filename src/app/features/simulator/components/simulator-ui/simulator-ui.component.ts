import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../../../core/services/simulation.service';
import { ThreeSceneService } from '../../../../core/services/three-scene.service';

@Component({
  selector: 'app-simulator-ui',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simulator-ui.component.html',
  styleUrls: ['./simulator-ui.component.css']
})
export class SimulatorUiComponent {
  simService = inject(SimulationService);
  threeService = inject(ThreeSceneService);

  changeMode(mode: 'metal' | 'nonmetal') {
    this.simService.setMode(mode);
    this.threeService.clearPhotons();
  }

  toggleElectrons(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.simService.toggleElectrons(checked);
  }

  shootLight(type: any) {
    this.threeService.shootLight(type);
  }
}
