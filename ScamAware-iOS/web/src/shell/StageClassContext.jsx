import { createContext, useContext, useEffect } from 'react';

// Lets an individual page add an extra class to the shared stage element
// AppShell owns (e.g. Feed needs "feed-stage" alongside the base "app ar-stage"
// classes) without duplicating the stage's sizing/background CSS per page.
const StageClassContext = createContext(null);

export function StageClassProvider({ setExtraClass, children }) {
  return (
    <StageClassContext.Provider value={setExtraClass}>
      {children}
    </StageClassContext.Provider>
  );
}

export function useStageClassName(extraClass) {
  const setExtraClass = useContext(StageClassContext);
  useEffect(() => {
    if (!setExtraClass || !extraClass) return;
    setExtraClass(extraClass);
    return () => setExtraClass('');
  }, [setExtraClass, extraClass]);
}
