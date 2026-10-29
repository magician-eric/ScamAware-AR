// The case number with one place to wrap: "TPECIB-20261019" and "-165-1036"
// prefer a break between them. CSS also permits an emergency wrap inside a
// part when a narrow translated label leaves less room than that part needs.
export function CaseNumber({ value }) {
  const match = /^(.*)(-165-\d+)$/.exec(value ?? '');
  if (!match) return value ?? null;
  return (
    <>
      <span className="pol-case-number-part">{match[1]}</span>
      <wbr />
      <span className="pol-case-number-part">{match[2]}</span>
    </>
  );
}
