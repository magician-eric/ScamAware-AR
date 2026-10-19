// The case number with one place to wrap: "TPECIB-20261019" and "-165-1036"
// each stay whole, and a narrow LINE bubble or card breaks between them
// instead of running the number out of its box.
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
