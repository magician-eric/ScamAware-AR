// `*詞*` in a dialogue line marks a stress word - the pressure vocabulary the
// scam leans on (限時／凍結／保密). Both surfaces that render dialogue text
// share this parser so a line reads the same wherever it is shown: the phone
// call's subtitle plate (Subtitle.jsx) and the LINE transcript
// (ScriptedLineConversation.jsx). Whichever surface renders it supplies the
// class, because the two sit on opposite backgrounds - light pink over the
// dark subtitle plate, deep red inside a white LINE bubble.
function parseStress(text) {
  return (text ?? '').split(/(\*[^*]+\*)/).filter(Boolean).map((chunk, i) => (
    chunk.startsWith('*') && chunk.endsWith('*')
      ? { key: i, text: chunk.slice(1, -1), stress: true }
      : { key: i, text: chunk, stress: false }
  ));
}

export function StressText({ text, stressClassName = 'pol-stress' }) {
  return parseStress(text).map((token) => (
    <span key={token.key} className={token.stress ? stressClassName : undefined}>{token.text}</span>
  ));
}
