// Entry point for `node --import`: the JSX loader the other component tests
// use, plus a react-router-dom stub so scenario screens can be mounted
// outside a <Router>. See scripts/gesture-contract.test.mjs.
import { register } from 'node:module';
register('./jsx-test-loader.mjs', import.meta.url);
register('./react-router-stub-loader.mjs', import.meta.url);
