export interface StaticCelestialData {
    name: string;
    texture: string | null;
    ringTexture?: string;
    rotationPeriodDays: number; // Sidereal rotation period in Earth days. Negative is retrograde.
    axialTilt?: number; // in degrees
}

export const celestialStaticData: Record<string, StaticCelestialData> = {
    'The Sun': {
        name: 'The Sun',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
        rotationPeriodDays: 25.38,
    },
    'Mercury': {
        name: 'Mercury',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
        rotationPeriodDays: 58.6,
        axialTilt: 0.03,
    },
    'Venus': {
        name: 'Venus',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
        rotationPeriodDays: -243, // Retrograde rotation
        axialTilt: 177.4,
    },
    'Earth': {
        name: 'Earth',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
        rotationPeriodDays: 0.997,
        axialTilt: 23.4,
    },
    'The Moon': {
        name: 'The Moon',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
        rotationPeriodDays: 27.3, // Tidally locked, but we'll show rotation
        axialTilt: 6.7,
    },
    'Mars': {
        name: 'Mars',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
        rotationPeriodDays: 1.03,
        axialTilt: 25.2,
    },
    'Jupiter': {
        name: 'Jupiter',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
        rotationPeriodDays: 0.41,
        axialTilt: 3.1,
    },
    'Saturn': {
        name: 'Saturn',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
        ringTexture: 'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',
        rotationPeriodDays: 0.45,
        axialTilt: 26.7,
    },
    'Uranus': {
        name: 'Uranus',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
        ringTexture: 'https://www.solarsystemscope.com/textures/download/2k_uranus_ring_alpha.png',
        rotationPeriodDays: -0.72, // Retrograde rotation
        axialTilt: 97.8, // Extreme axial tilt
    },
    'Neptune': {
        name: 'Neptune',
        texture: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
        rotationPeriodDays: 0.67,
        axialTilt: 28.3,
    },
    'A Black Hole': {
        name: 'A Black Hole',
        texture: null,
        rotationPeriodDays: 0.1, // Fictional, for visual effect
    },
    'A Nebula': {
        name: 'A Nebula',
        texture: null,
        rotationPeriodDays: 100, // Fictional, for slow visual drift
    },
};

export const skyTexture = 'https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg';

// Base duration for a reference object (Earth) to complete one rotation in milliseconds.
// All other object rotation speeds will be calculated relative to this.
export const BASE_ROTATION_DURATION_MS = 40000; // 40 seconds for Earth rotation
