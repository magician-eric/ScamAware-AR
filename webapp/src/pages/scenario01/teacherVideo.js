// Which recording of 陳老師's pitch each language gets.
//
// Extracted out of VideoTeacher.jsx so the mapping is data rather than a
// component detail - the same move heroLayout.js already is for the AR scan
// artwork, and for the same two reasons: a locale-coverage check can read a
// data module (scripts/validate-localized-assets.mjs) but not a component
// that has to be rendered, and a language's file belongs beside every other
// language's file rather than inside whichever screen happens to play it.
//
// Each language has its own recorded pitch (shot vertically, 9:16) rather
// than reusing one video with subtitles - zh is the original recording,
// en/jp are separate re-shoots. The filenames are not parallel because each
// re-shoot arrived with the exporting tool's own name; that is exactly why
// this is a lookup table and not a filename pattern. Nothing may derive a
// language's file by appending a suffix to another language's.
const VIDEO_DIR = `${import.meta.env?.BASE_URL ?? '/'}assets/scenarios/scenario-01/videos/`;

export const TEACHER_VIDEO_SRC = {
  zh: `${VIDEO_DIR}chen-teacher-pitch.mp4`,
  en: `${VIDEO_DIR}teacher-en-f_SC6owoUR.mp4`,
  jp: `${VIDEO_DIR}teacher-jp-f_ftgjUw1g.mp4`,
};
