import * as migration_20260911_140041_initial_schema from './20260911_140041_initial_schema';
import * as migration_20260911_141108_navbar_logo from './20260911_141108_navbar_logo';
import * as migration_20260912_190054_cms_user_profiles from './20260912_190054_cms_user_profiles';
import * as migration_20260912_190705_cms_user_names from './20260912_190705_cms_user_names';
import * as migration_20260912_191057_super_admin_role from './20260912_191057_super_admin_role';

export const migrations = [
  {
    up: migration_20260911_140041_initial_schema.up,
    down: migration_20260911_140041_initial_schema.down,
    name: '20260911_140041_initial_schema',
  },
  {
    up: migration_20260911_141108_navbar_logo.up,
    down: migration_20260911_141108_navbar_logo.down,
    name: '20260911_141108_navbar_logo',
  },
  {
    up: migration_20260912_190054_cms_user_profiles.up,
    down: migration_20260912_190054_cms_user_profiles.down,
    name: '20260912_190054_cms_user_profiles',
  },
  {
    up: migration_20260912_190705_cms_user_names.up,
    down: migration_20260912_190705_cms_user_names.down,
    name: '20260912_190705_cms_user_names',
  },
  {
    up: migration_20260912_191057_super_admin_role.up,
    down: migration_20260912_191057_super_admin_role.down,
    name: '20260912_191057_super_admin_role'
  },
];
