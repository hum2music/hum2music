#!/usr/bin/env bash
# Publishes every npm-published package that lives directly in this repo
# (not as a git submodule) to the public npm registry, skipping any package
# whose version is already live.
#
# bun publish doesn't support npm's OIDC trusted publishing, so each package
# is packed with `bun pm pack` (which resolves workspace:* to a real, pinned
# version the same way `bun publish` would) and the resulting tarball is
# handed to `npm publish`, which does support OIDC.
#
# The 8 packages split into their own repos (core, music-theory,
# audio-analysis, expression, midi, harmony, rendering, arrangement) publish
# themselves via their own repo's .github/workflows/publish.yaml.
set -euo pipefail

PACKAGE_DIRS=(
  packages/counterpoint
  packages/form
  packages/motif
  packages/orchestration
  packages/plugin-api
  packages/plugin-host
  packages/sdk
  packages/soundfont
  packages/testing
  plugins/composers/chorale
  plugins/composers/motif-development
  plugins/instruments/bass
  plugins/instruments/cello
  plugins/instruments/drums
  plugins/instruments/guitar
  plugins/instruments/piano
  plugins/instruments/viola
  plugins/instruments/violin
  plugins/renderers/builtin-synth
  plugins/renderers/soundfont
  plugins/styles/chiptune
  plugins/styles/classical
  plugins/styles/piano-solo
  plugins/styles/pop-ballad
  apps/web
  apps/cli
)

for dir in "${PACKAGE_DIRS[@]}"; do
  name=$(node -p "require('./${dir}/package.json').name")
  local_version=$(node -p "require('./${dir}/package.json').version")
  published_version=$(npm view "$name" version --registry https://registry.npmjs.org 2>/dev/null || true)

  if [ "$local_version" = "$published_version" ]; then
    echo "=== $name@$local_version already published, skipping ==="
    continue
  fi

  echo "=== Publishing $name@$local_version (currently published: ${published_version:-none}) ==="
  # --destination . (not the default, omitted form) is what makes bun pm pack
  # print an absolute path, which this script needs since it calls npm
  # publish from the repo root, not from inside $dir.
  tarball_path=$(cd "$dir" && bun pm pack --quiet --destination .)
  npm publish --access public "$tarball_path"
  rm -f "$tarball_path"
done
