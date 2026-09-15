// Keep temporary, reviewed exceptions in one place. An exception changes the
// audit status to REPORT; it never hides the finding from the report.
// Empty is the healthy state, and the list stays here for the next exception
// rather than being deleted with the last one. `blackpi-search-input` lived
// here until the Scenario 04 audit batch it was waiting on landed: the search
// bar is a non-editable pill now (src/apps/blackpi/screens/Search.jsx), so
// there is no input to except, and audit-ar-interactions.mjs asserts that no
// new editable control appears in the BlackPi storefront.
export const KNOWN_EXCEPTIONS = Object.freeze([]);

export function findKnownException(finding, exceptions = KNOWN_EXCEPTIONS) {
  return exceptions.find((exception) =>
    exception.file === finding.file
    && exception.interactionType === finding.interactionType
    && (!exception.context || exception.context === finding.context));
}
