/// <reference types="react" />

// This file provides global type definitions for A-Frame's custom elements,
// allowing them to be used in JSX without causing TypeScript errors.

declare global {
    namespace JSX {
      interface IntrinsicElements {
        'a-scene': any;
        'a-entity': any;
        'a-box': any;
        'a-camera': any;
        'a-circle': any;
        'a-cone': any;
        'a-cursor': any;
        'a-curvedimage': any;
        'a-cylinder': any;
        'a-dodecahedron': any;
        'a-gltf-model': any;
        'a-icosahedron': any;
        'a-image': any;
        'a-light': any;
        'a-link': any;
        'a-octahedron': any;
        'a-plane': any;
        'a-ring': any;
        'a-sky': any;
        'a-sound': any;
        'a-sphere': any;
        'a-tetrahedron': any;
        'a-text': any;
        'a-torus-knot': any;
        'a-torus': any;
        'a-triangle': any;
        'a-video': any;
        'a-videosphere': any;
        'a-assets': any;
      }
    }
}

export {};
