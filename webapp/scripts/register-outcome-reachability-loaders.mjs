// Entry point for `node --import`, used by scripts/outcome-reachability.test.mjs.
//
// The gesture-contract loaders (JSX + the react-router-dom stub, so a screen
// can be mounted outside a <Router> and its navigations recorded), plus one
// more stub for GuGo Invest's TypeScript React surface - see
// scripts/stubs/gugo-invest-app.mjs.
import { register } from 'node:module';
register('./jsx-test-loader.mjs', import.meta.url);
register('./react-router-stub-loader.mjs', import.meta.url);
register('./gugo-invest-stub-loader.mjs', import.meta.url);
