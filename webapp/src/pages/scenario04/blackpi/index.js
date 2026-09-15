// Scenario 04's mount points for the BlackPi app module. routes.jsx mounts
// these, never apps/blackpi directly, so both the store and the routes stay
// on this side of the boundary. See hosts.jsx for the full ownership
// rationale and routes.js for the event -> route map.
export * from './hosts';
export { BLACKPI_ROUTES } from './routes';
