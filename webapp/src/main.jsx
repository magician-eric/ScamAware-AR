import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/global.css';
import './styles/scenario01.css';
import './styles/scenario02.css';
import './apps/blackpi/styles/index.css';
import './apps/hpe-logistics/styles/index.css';
import './styles/scenario03.css';
import './apps/mydondon/styles/index.css';
import './apps/meetu/styles/index.css';
import { App } from './App.jsx';
import { publishReleaseInfo } from './lib/releaseInfo.js';

// Which Web Bundle this is, and which Shell it landed in - written to the console (so it reaches
// `adb logcat` on the glasses) and to window.__cibarRelease, before anything renders. Nothing is
// drawn: the production app has no engineering UI. See docs/RELEASE_VERSIONING.md.
publishReleaseInfo();

// HashRouter (not BrowserRouter): this is a kiosk-style app with no
// SEO/shareable-URL need, and it sidesteps GitHub Pages' "deep-link refresh
// returns 404" problem with zero extra tooling.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
