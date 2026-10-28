import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage, cursorPos, fade, near } from '../Stage';
import { Shell } from '../ac/Shell';
import { C, FONT } from '../ac/theme';
import { Button, Switch } from '../ac/primitives';

// DS Free "Hide tiles for": react-account-center settings/templates/_components/sections/recordings.js +
// form-controls/roles-select.js (SAMBA-9721). Settings > Templates > Edit template > Recordings.
export const HIDE_LEN = 430;
// toggle after 'hide tiles in recordings' (05a @75-91); chips go on 05b 'roles' (@218) and 'out' (@239)
const C_ = { toggle: 100, x1: 215, x2: 245 };
export const HIDE_CLICKS = Object.values(C_);

const X = 281; // content left
const NAV_W = 220;
const RX = X + NAV_W + 20; // rows left (501)
const RW = 1416 - RX; // rows width (915)
const CTRL = RX + 400; // control column
const SECTIONS = ['General', 'Components', 'Content library', 'Recordings', 'Restream', 'Chat', 'Q&A', 'Breakout rooms'];
const ROLES = ['Moderators', 'Speakers', 'Attendees'];
const CHIP_W: Record<string, number> = { Moderators: 126, Speakers: 110, Attendees: 112 };
const chipLefts = (list: string[]) => {
  let x = CTRL + 12;
  return list.map((r) => {
    const left = x;
    x += CHIP_W[r] + 8;
    return left;
  });
};
const ROW4_Y = 506;
const chipX = (list: string[], role: string) => {
  const i = list.indexOf(role);
  return { x: chipLefts(list)[i] + CHIP_W[role] - 18, y: ROW4_Y + 6 + 16 };
};
const toggleAt = { x: CTRL + 19, y: 431 };

const Row: React.FC<{ y: number; label: string; desc?: React.ReactNode; children?: React.ReactNode; opacity?: number }> = ({ y, label, desc, children, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: RX, top: y, width: RW, opacity }}>
    <div style={{ width: 360 }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{label}</div>
      {desc && <div style={{ fontSize: 14, lineHeight: 1.35, color: C.textSecondary }}>{desc}</div>}
    </div>
    <div style={{ position: 'absolute', left: CTRL - RX, top: 0 }}>{children}</div>
  </div>
);

const Radio: React.FC<{ label: string; on: boolean }> = ({ label, on }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
    <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${on ? C.primary : '#757575'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {on && <div style={{ width: 8, height: 8, borderRadius: 4, background: C.primary }} />}
    </div>
    {label}
  </div>
);

const PATH = [
  { f: 0, x: 1000, y: 680 },
  { f: 50, x: 1000, y: 680 },
  { f: 92, ...toggleAt },
  { f: 130, ...toggleAt },
  { f: 200, ...chipX(ROLES, 'Moderators') },
  { f: 222, ...chipX(ROLES, 'Moderators') },
  { f: 238, ...chipX(['Speakers', 'Attendees'], 'Speakers') },
  { f: 262, ...chipX(['Speakers', 'Attendees'], 'Speakers') },
  { f: 300, x: CTRL + 60, y: ROW4_Y + 120 },
];
const CAMERA = [
  { f: 0, z: 1, x: 720, y: 405 },
  { f: 60, z: 1, x: 720, y: 405 },
  { f: 90, z: 1.35, x: 860, y: 440 },
  { f: 290, z: 1.35, x: 860, y: 440 },
  { f: 320, z: 1.5, x: 870, y: 500 },
];

export const FreeHideTiles: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = cursorPos(frame, PATH);
  const hideOn = frame >= C_.toggle + 2;
  const hidden = frame >= C_.x2 + 2 ? ['Attendees'] : frame >= C_.x1 + 2 ? ['Speakers', 'Attendees'] : ROLES;
  const recorded = ROLES.filter((r) => !hidden.includes(r));
  const reveal = fade(frame, C_.toggle + 2, C_.toggle + 12);
  const push = 112 * reveal;
  const lefts = chipLefts(hidden);

  return (
    <Stage url="my.digitalsamba.com/settings/templates/weekly-sync" camera={CAMERA} path={PATH} clicks={HIDE_CLICKS}>
      <Shell active={4}>
        <div style={{ position: 'absolute', left: X, top: 134, fontSize: 24 }}>Edit template</div>
        <Button x={1416 - 92 - 12 - 84 - 12 - 92} y={130} w={92} label="Cancel" variant="secondary" />
        <Button x={1416 - 92 - 12 - 84} y={130} w={84} label="Reset" variant="secondary" />
        <Button x={1416 - 92} y={130} w={92} label="Save" />

        {/* section nav */}
        {SECTIONS.map((s, i) => {
          const on = s === 'Recordings';
          return (
            <div key={s} style={{ position: 'absolute', left: X, top: 196 + i * 40, height: 36, display: 'flex', alignItems: 'center', paddingLeft: 14, fontSize: 15, color: on ? C.primary : C.text, borderLeft: `3px solid ${on ? C.primary : 'transparent'}`, fontWeight: on ? 600 : 400 }}>
              {s}
            </div>
          );
        })}

        <div style={{ position: 'absolute', left: RX, top: 196, fontSize: 18, fontWeight: 600 }}>Recordings</div>
        <div style={{ position: 'absolute', left: RX, top: 230, width: RW, height: 1, background: C.divider }} />

        <Row y={250} label="Recordings" desc="Enable or disable session recording for this call.">
          <Switch x={0} y={0} on />
        </Row>
        <Row y={318} label="Recording layout mode" desc="Select the default layout used in the recording. “Auto” uses the layout set by the user; “Tiled” uses fixed tiles.">
          <div style={{ display: 'flex', gap: 28 }}>
            <Radio label="Auto" on />
            <Radio label="Tiled" on={false} />
          </div>
        </Row>
        <Row y={420} label="Hide tiles in recordings" desc="Hide participant video tiles from the recording (useful for audio-only sessions or screen shares).">
          <div style={{ position: 'relative', filter: near(cur, toggleAt, 24, 16) ? 'brightness(1.08)' : undefined }}>
            <Switch x={0} y={0} on={hideOn} />
          </div>
        </Row>
        {reveal > 0 && (
          <Row
            y={ROW4_Y}
            opacity={reveal}
            label="Hide tiles for"
            desc={
              <>
                Tiles recorded: <b style={{ color: C.text }}>{recorded.length ? recorded.join(', ') : 'none'}</b>. Audio and shared content is recorded for everyone.
                <br />
                Roles added to this template later are hidden by default.
              </>
            }
          >
            <div style={{ width: RW - 400, minHeight: 44, border: `1px solid ${C.divider}`, borderRadius: 4, position: 'relative', boxSizing: 'border-box' }}>
              {hidden.length === 0 && <span style={{ position: 'absolute', left: 14, top: 12, fontSize: 15, color: '#a2a2a2' }}>– Add roles here –</span>}
              {hidden.map((r, i) => {
                const hot = near(cur, chipX(hidden, r), 14, 14);
                return (
                  <div
                    key={r}
                    style={{
                      position: 'absolute',
                      left: lefts[i] - CTRL,
                      top: 6,
                      width: CHIP_W[r],
                      height: 32,
                      boxSizing: 'border-box',
                      padding: '0 8px 0 14px',
                      borderRadius: 16,
                      background: '#EFEFEF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 15,
                      fontFamily: FONT,
                    }}
                  >
                    {r}
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: hot ? '#757575' : 'rgba(0,0,0,0.26)', color: '#fff', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </div>
                  </div>
                );
              })}
              <div style={{ position: 'absolute', right: 8, top: 10, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #757575', marginTop: 8 }} />
            </div>
          </Row>
        )}
        <Row y={530 + push} label="Show logo in recordings">
          <Switch x={0} y={0} on />
        </Row>
        <Row y={598 + push} label="Show name badges in recordings">
          <Switch x={0} y={0} on />
        </Row>
      </Shell>
    </Stage>
  );
};
