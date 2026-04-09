import { Component, ElementRef, AfterViewInit, ViewChild, inject } from '@angular/core';
import { ThreeSceneService } from '../../../../core/services/three-scene.service';

@Component({
  selector: 'app-simulator-canvas',
  standalone: true,
  template: `<div #container class="canvas-container"></div>`,
  styles: [`
    .canvas-container {
      width: 100%;
      height: 100%;
      background: transparent;
    }
  `]
})
export class SimulatorCanvasComponent implements AfterViewInit {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
  private threeService = inject(ThreeSceneService);

  ngAfterViewInit() {
    this.threeService.init(this.container);
  }
}
