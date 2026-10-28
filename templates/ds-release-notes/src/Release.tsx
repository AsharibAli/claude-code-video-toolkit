import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { TitleCard, OutroCard, SceneLabel, TITLE_LEN, OUTRO_LEN } from './scenes/Cards';
import { Transcription, TRANS_LEN, TRANS_CLICKS } from './scenes/Transcription';
import { Samsung, SAMSUNG_LEN, SAMSUNG_SFX_AT, Tablet, TABLET_LEN, TABLET_FIX_AT, Pinned, PINNED_LEN, PINNED_CLICKS } from './scenes/Fixes';
import { FreeHideTiles, HIDE_LEN, HIDE_CLICKS } from './scenes/FreeHideTiles';
import { FreeCustomLink, LINK_LEN, LINK_CLICKS, LINK_TYPE_AT } from './scenes/FreeCustomLink';

// ---------------------------------------------------------------------------
// Release 650 (30fps). VO is Lugh: a Qwen3 clone of assets/voices/lugh-ref-expressive.wav (lugh-ref.wav with its
// pitch contour expanded 2.0x and slowed 15% in Praat, so the clone keeps the voice but gains intonation). Each
// line is split at sentences, three takes per phrase, best take picked by tools/pick_takes.py (pace, then
// pitch spread). Clicks sit on the words that name them (public/audio/scenes/*.captions.json).
//   title          00a 82f @15, 00b 31f @112                            165f
//   transcription  01a 89f @10, 01b 216f @112, 01c 95f @344             480f
//   samsung        02a 34f @10, 02b 137f @58, 02c 182f @210             430f
//   tablet         03 192f @10                                          240f
//   pinned         04 211f @10                                          260f
//   hide           05a 168f @10, 05b 82f @192, 05c 103f @288            430f
//   link           06a 232f @10, 06b 170f @256                          470f
//   outro          07 72f @10                                           120f
// ---------------------------------------------------------------------------
type Scene = {
  id: string;
  len: number;
  vo: string;
  voAt: number;
  moreVo?: [string, number][]; // further phrases of the same line, placed on their own beats
  el: React.ReactNode;
  label?: [string, string];
  clicks?: number[];
  sfx?: { file: string; at: number; volume: number; frames?: number }[];
};

const SCENES: Scene[] = [
  { id: 'title', len: TITLE_LEN, vo: '00a_title', voAt: 15, moreVo: [['00b_title', 112]], el: <TitleCard /> },
  { id: 'transcription', len: TRANS_LEN, vo: '01a_transcription', voAt: 10, moreVo: [['01b_transcription', 112], ['01c_transcription', 344]], el: <Transcription />, label: ['New feature', 'Transcription language applies to everyone'], clicks: TRANS_CLICKS },
  { id: 'samsung', len: SAMSUNG_LEN, vo: '02a_samsung', voAt: 10, moreVo: [['02b_samsung', 58], ['02c_samsung', 210]], el: <Samsung />, label: ['Fixed', 'Joining on Samsung Internet'], sfx: [{ file: 'pop', at: SAMSUNG_SFX_AT, volume: 0.3 }] },
  { id: 'tablet', len: TABLET_LEN, vo: '03_tablet', voAt: 10, el: <Tablet />, label: ['Fixed', 'Virtual backgrounds on Android tablets'], sfx: [{ file: 'reveal', at: TABLET_FIX_AT, volume: 0.25 }] },
  { id: 'pinned', len: PINNED_LEN, vo: '04_pinned', voAt: 10, el: <Pinned />, label: ['Fixed', 'Avatar in a pinned tile'], clicks: PINNED_CLICKS },
  { id: 'hide', len: HIDE_LEN, vo: '05a_hide', voAt: 10, moreVo: [['05b_hide', 192], ['05c_hide', 288]], el: <FreeHideTiles />, label: ['Digital Samba Free', 'Hide tiles in recordings, by role'], clicks: HIDE_CLICKS },
  { id: 'link', len: LINK_LEN, vo: '06a_link', voAt: 10, moreVo: [['06b_link', 256]], el: <FreeCustomLink />, label: ['Digital Samba Free', 'Custom room link warning'], clicks: LINK_CLICKS, sfx: [{ file: 'typing', at: LINK_TYPE_AT, volume: 0.3, frames: 24 }] },
  { id: 'outro', len: OUTRO_LEN, vo: '07_outro', voAt: 10, el: <OutroCard /> },
];

const starts = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].len], []);
export const RELEASE_LEN = SCENES.reduce((n, s) => n + s.len, 0);

const Sfx: React.FC<{ file: string; at: number; volume: number; frames?: number }> = ({ file, at, volume, frames }) => (
  <Sequence from={at} durationInFrames={frames} layout="none">
    <Audio
      src={staticFile(`audio/sfx/${file}.mp3`)}
      volume={(f) => (frames ? volume * interpolate(f, [frames - 6, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : volume)}
    />
  </Sequence>
);

export const Release: React.FC = () => (
  <AbsoluteFill style={{ background: '#f8fafe' }}>
    {SCENES.map((s, i) => (
      <Sequence key={s.id} from={starts[i]} durationInFrames={s.len}>
        {s.el}
        {s.label && <SceneLabel kind={s.label[0]} title={s.label[1]} />}
        <Sequence from={s.voAt} layout="none">
          <Audio src={staticFile(`audio/scenes/${s.vo}.mp3`)} />
        </Sequence>
        {(s.moreVo ?? []).map(([file, at]) => (
          <Sequence key={file} from={at} layout="none">
            <Audio src={staticFile(`audio/scenes/${file}.mp3`)} />
          </Sequence>
        ))}
        {(s.clicks ?? []).map((c) => (
          <Sfx key={`c${c}`} file="click" at={c} volume={0.45} />
        ))}
        {(s.sfx ?? []).map((x) => (
          <Sfx key={`${x.file}${x.at}`} {...x} />
        ))}
        {i > 0 && <Sfx file="whoosh" at={0} volume={0.2} />}
      </Sequence>
    ))}
  </AbsoluteFill>
);
