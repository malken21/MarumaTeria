import { Component } from '@angular/core';
import { SimulatorCanvasComponent } from './features/simulator/components/simulator-canvas/simulator-canvas.component';
import { SimulatorUiComponent } from './features/simulator/components/simulator-ui/simulator-ui.component';


@Component({
  selector: 'app-root',
  imports: [SimulatorCanvasComponent, SimulatorUiComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
