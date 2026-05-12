export const ParticleType = {
  EMPTY: 0,
  SAND: 1,
  WATER: 2,
  STONE: 3,
};

export const ParticleConfig = {
  [ParticleType.EMPTY]: {
    name: 'empty',
    density: 0,
    color: '#0a0a0f',
  },
  [ParticleType.SAND]: {
    name: 'sand',
    density: 4,
    color: '#e6c07b',
    colorVariance: 20,
  },
  [ParticleType.WATER]: {
    name: 'water',
    density: 2,
    color: '#4a9eff',
    colorVariance: 15,
    spread: 3,
  },
  [ParticleType.STONE]: {
    name: 'stone',
    density: 10,
    color: '#808080',
    colorVariance: 10,
    immovable: true,
  },
};
