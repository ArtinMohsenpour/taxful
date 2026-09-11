import * as migration_20260911_140041_initial_schema from './20260911_140041_initial_schema';
import * as migration_20260911_141108_navbar_logo from './20260911_141108_navbar_logo';

export const migrations = [
  {
    up: migration_20260911_140041_initial_schema.up,
    down: migration_20260911_140041_initial_schema.down,
    name: '20260911_140041_initial_schema',
  },
  {
    up: migration_20260911_141108_navbar_logo.up,
    down: migration_20260911_141108_navbar_logo.down,
    name: '20260911_141108_navbar_logo'
  },
];
