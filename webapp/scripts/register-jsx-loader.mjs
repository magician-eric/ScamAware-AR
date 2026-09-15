// Entry point for `node --import`: registers scripts/jsx-test-loader.mjs so
// tests can import the app's JSX sources directly.
import { register } from 'node:module';
register('./jsx-test-loader.mjs', import.meta.url);
