import { useCallback, useEffect, useRef, useState } from 'react';
import { recordChoice } from '../../lib/scenario03Store';
import { useScenarioAudio } from './useScenarioAudio';

// Drives one scene's scripted dialogue: plays beats one at a time, pauses on
// a 2-choice moment, then splices the player's own line plus that option's
// branch-specific reply back in front of the remaining main line (both
// branches merge back, and neither is ever marked right or wrong).
//
// Beats come from data/scenario03Dialogues.js - this hook holds no content.
// A beat is { id, speaker, speakerLabel, text, card?, audioSrc?, audioLead?,
// audioStart?, audioEnd? } or { id, type: 'choice', momentKey, question,
// options: [{ id, label, playerLine, reply: [beat], flags: [] }] }.
//
// Timing: if the beat's block has a real recording that is actually playing,
// the beat ends when the audio passes its `audioEnd` fraction (1 = the
// clip's real measured duration, since data/scenario03Dialogues.js now
// merges every recorded block's lines into one beat covering the whole
// clip - see buildDialogueBeats). If the file is missing/blocked/muted the
// beat falls back to the character-timed duration below; the cap is sized
// for a whole multi-sentence paragraph now, not a single short line.

function beatDuration(beat, pace) {
  const plain = (beat.text ?? '').replace(/\*/g, '');
  const base = beat.ms ?? Math.min(20000, 1100 + plain.length * 115);
  return Math.max(600, base * pace);
}

export function useScriptPlayer(script, pace = 1, enabled = true) {
  const queueRef = useRef([]);
  const [current, setCurrent] = useState(null);
  const [choice, setChoice] = useState(null);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const audio = useScenarioAudio();
  const { play, stop, pause } = audio;

  const advance = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) {
      setCurrent(null);
      setChoice(null);
      setDone(true);
      return;
    }
    const head = queue.shift();
    if (head.type === 'choice') {
      setCurrent(null);
      setChoice(head);
      return;
    }
    setChoice(null);
    setCurrent(head);
    setLog((prev) => [...prev, head]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      queueRef.current = [];
      setLog([]);
      setChoice(null);
      setDone(false);
      setCurrent(null);
      stop();
      return;
    }
    queueRef.current = [...script];
    setLog([]);
    setChoice(null);
    setDone(false);
    setCurrent(null);
    advance();
  }, [script, enabled, advance, stop]);

  // Start (or keep) the right clip for the current beat: only the first line
  // of a block starts its recording, the rest of that block ride the same
  // clip, and a beat with no audio stops whatever was playing.
  useEffect(() => {
    if (!enabled || !current) return;
    if (current.audioLead) play(current.audioSrc);
    else if (!current.audioSrc) stop();
  }, [current, enabled, play, stop]);

  // A 2-choice moment pauses the scene, voice line included.
  useEffect(() => {
    if (enabled && choice) pause();
  }, [choice, enabled, pause]);

  const audioSynced = Boolean(
    current?.audioSrc && audio.src === current.audioSrc && audio.progress !== null,
  );

  useEffect(() => {
    if (!enabled || !current) return undefined;
    if (audioSynced) {
      if (audio.progress >= (current.audioEnd ?? 1)) advance();
      return undefined;
    }
    const timer = window.setTimeout(advance, beatDuration(current, pace));
    return () => window.clearTimeout(timer);
  }, [current, pace, enabled, advance, audioSynced, audio.progress]);

  const choose = useCallback((option) => {
    if (!enabled || !choice) return;
    recordChoice(choice.momentKey, option.id, option.flags ?? []);
    const injected = [
      { id: `${choice.id}-${option.id}-said`, speaker: 'player', text: option.playerLine ?? option.label },
      ...(option.reply ?? []),
    ];
    queueRef.current = [...injected, ...queueRef.current];
    setChoice(null);
    advance();
  }, [choice, enabled, advance]);

  return { current, choice, log, done, choose, skip: advance, stop };
}
