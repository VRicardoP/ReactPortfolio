// Run with Node: build configuration does not execute in a browser/DOM realm.
import assert from 'node:assert/strict'
import config from '../vite.config.js'

const chunkFor = config.build.rollupOptions.output.manualChunks
for (const dependency of ['leaflet', 'react-leaflet', '@react-leaflet/core']) {
  assert.equal(chunkFor(`/project/node_modules/${dependency}/lib/index.js`), 'vendor-maps')
}
assert.equal(chunkFor('/project/node_modules/react/index.js'), 'vendor-react')
console.log('Map adapters remain lazy; React runtime boundary intact.')
