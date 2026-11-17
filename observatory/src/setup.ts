import * as THREE from 'three';
import { initPage } from '../../shared/stim.js';

// The Bar v2 spec and the Dev rows come in later tasks.
export const ui = initPage({ id: 'observatory', bar: {} });

export const stageEl = document.getElementById('stage')!;

export let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  stageEl.querySelector<HTMLElement>('.fail')!.hidden = false;
  ui.hideControls();
  throw err;
}
renderer.setClearColor(0x000000, 1);
stageEl.prepend(renderer.domElement);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
