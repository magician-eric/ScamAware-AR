// Entry point for `node --import`: the JSX loader the other component tests
// use, plus the recogniser stub so ArScanHome can be rendered without a
// camera. See scripts/ar-scan-entry.test.mjs.
import { register } from 'node:module';
register('./jsx-test-loader.mjs', import.meta.url);
register('./ar-scan-stub-loader.mjs', import.meta.url);
