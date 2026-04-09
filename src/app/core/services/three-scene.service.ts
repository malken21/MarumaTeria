import { Injectable, ElementRef, OnDestroy, NgZone, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SimulationRendererService } from './simulation-renderer.service';
import { MetalType } from '../../shared/models/simulation.types';

@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private animationId?: number;

  private ngZone = inject(NgZone);
  private simRenderer = inject(SimulationRendererService);

  init(container: ElementRef<HTMLDivElement>) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    const width = container.nativeElement.clientWidth;
    const height = container.nativeElement.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.setCameraPosition(width);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Initialize Simulation Renderer
    this.simRenderer.init(this.scene);
    
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });

    window.addEventListener('resize', () => this.onResize(container));
  }

  shootLight(type: MetalType) {
    this.simRenderer.shootLight(type);
  }

  private setCameraPosition(width: number) {
    if (width <= 600) {
      this.camera.position.set(0, 20, 45);
    } else {
      this.camera.position.set(0, 15, 30);
    }
  }

  private onResize(container: ElementRef<HTMLDivElement>) {
    const width = container.nativeElement.clientWidth;
    const height = container.nativeElement.clientHeight;
    if (!this.camera || !this.renderer || !this.composer) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.setCameraPosition(width);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls?.update();
    
    // Update Simulation State
    this.simRenderer.update();
    
    this.composer?.render();
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
  }
}
