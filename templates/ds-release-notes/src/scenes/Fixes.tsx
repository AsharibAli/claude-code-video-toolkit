import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stage, cursorPos, fade, near } from '../Stage';
import { RoomChrome, stageRect } from '../room/Room';
import { byId, initials } from '../room/people';
import { R, RFONT } from '../room/theme';
import { RIcon } from '../room/icons';

const BG = 'linear-gradient(135deg, #f8fafe 0%, #EBF1FC 100%)';
const DARK_PAPER = '#272A2E';
const PRIMARY_DARK = '#739CE9';

const Pill: React.FC<{ text: string; opacity: number; bottom?: number }> = ({ text, opacity, bottom = 48 }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      bottom,
      transform: `translateX(-50%) translateY(${(1 - opacity) * 16}px)`,
      opacity,
      background: '#323F66',
      color: '#fff',
      fontFamily: RFONT,
      fontSize: 30,
      fontWeight: 600,
      padding: '14px 28px',
      borderRadius: 40,
      boxShadow: '0 12px 30px rgba(50,63,102,0.3)',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

// Touch ripple for the device scenes (no cursor on a phone)
const Tap: React.FC<{ x: number; y: number; at: number; frame: number }> = ({ x, y, at, frame }) => {
  const t = frame - at;
  if (t < 0 || t > 18) return null;
  const r = interpolate(t, [0, 18], [10, 60]);
  const o = interpolate(t, [0, 18], [0.5, 0]);
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `rgba(115,156,233,${o})` }} />;
};

const Spinner: React.FC<{ frame: number; size: number }> = ({ frame, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `${size / 10}px solid rgba(255,255,255,0.15)`,
      borderTopColor: PRIMARY_DARK,
      boxSizing: 'border-box',
      transform: `rotate(${frame * 14}deg)`,
    }}
  />
);

// ---------------------------------------------------------------------------
// Fix 1: Samsung Internet join stall. join/shared/PendingMediaNotice.tsx (SAMBA-9632), strings join:pending_media.*
// ---------------------------------------------------------------------------
export const SAMSUNG_LEN = 430;
const NOTICE_AT = 230; // 02c 'If the browser doesn't answer' (@226)
export const SAMSUNG_SFX_AT = NOTICE_AT;

export const Samsung: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
  const card = spring({ frame: frame - NOTICE_AT, fps, config: { damping: 14, mass: 0.8 } });
  const PH = { w: 400, h: 820, x: 760, y: 130 };
  const screen = { x: PH.x + 14, y: PH.y + 14, w: PH.w - 28, h: PH.h - 28 };
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: RFONT, opacity: intro }}>
      {/* Phone */}
      <div style={{ position: 'absolute', left: PH.x, top: PH.y, width: PH.w, height: PH.h, borderRadius: 54, background: '#111', boxShadow: '0 40px 90px rgba(10,15,40,0.4), 0 0 0 2px #333' }} />
      <div style={{ position: 'absolute', left: screen.x, top: screen.y, width: screen.w, height: screen.h, borderRadius: 42, background: '#000', overflow: 'hidden' }}>
        {/* status + browser bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px', color: '#fff', fontSize: 14, fontWeight: 600 }}>
          <span>10:42</span>
          <span style={{ fontSize: 12, letterSpacing: 1 }}>▲ ◢ ▮</span>
        </div>
        <div style={{ position: 'absolute', left: 14, right: 14, top: 44, height: 34, borderRadius: 17, background: '#1f2226', color: '#bbb', fontSize: 13, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
          app.digitalsamba.com/acme/weekly-sync
        </div>
        {/* join screen */}
        <Img src={staticFile('logo_mono.svg')} style={{ position: 'absolute', left: 32, top: 108, height: 22, filter: 'brightness(0) invert(1)' }} />
        <div style={{ position: 'absolute', left: 24, top: 150, width: screen.w - 48, height: 250, borderRadius: 12, background: R.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          {frame < NOTICE_AT + 4 ? <Spinner frame={frame} size={44} /> : <RIcon name="camera-off" size={56} color="rgba(255,255,255,0.5)" />}
        </div>
        <div style={{ position: 'absolute', left: 24, top: 420, width: screen.w - 48, height: 46, borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', padding: '0 14px', boxSizing: 'border-box' }}>
          Lena Fischer
        </div>
        <div style={{ position: 'absolute', left: 24, top: 480, width: screen.w - 48, height: 46, borderRadius: 6, background: PRIMARY_DARK, color: '#fff', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
          Join
        </div>
        {/* PendingMediaNotice */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: 300,
            background: DARK_PAPER,
            borderRadius: 10,
            padding: '18px 18px 10px',
            color: '#fff',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            opacity: card,
            transform: `translateY(${(1 - card) * 30}px) scale(${0.96 + 0.04 * card})`,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>Still waiting for your camera and microphone</div>
          <div style={{ fontSize: 14, lineHeight: 1.45, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
            Your browser hasn’t answered the camera and microphone request yet. Reloading the page usually fixes this.
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch', position: 'relative' }}>
            <div style={{ height: 40, borderRadius: 4, background: PRIMARY_DARK, color: '#000', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Reload
            </div>
            <div style={{ height: 40, color: PRIMARY_DARK, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Join without camera and microphone
            </div>
            <Tap x={(screen.w - 32) / 2} y={20} at={340} frame={frame} />
            <Tap x={(screen.w - 32) / 2} y={64} at={372} frame={frame} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 1230, top: 380, width: 520, fontSize: 26, lineHeight: 1.45, color: '#323F66', opacity: fade(frame, NOTICE_AT + 20, NOTICE_AT + 34) }}>
        If the browser never answers the camera and microphone request, the join screen now offers a way out instead of waiting on the loading screen.
      </div>
      <div style={{ position: 'absolute', left: 24, bottom: 16, fontSize: 18, color: 'rgba(50,63,102,0.55)' }}>Samsung Internet on Android</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Fix 2: virtual backgrounds on Android tablets. settings:virtual_bg.* strings; the bug blurred the whole picture.
// ---------------------------------------------------------------------------
export const TABLET_LEN = 240;
const FIX_AT = 76; // 'work again' (@77)
export const TABLET_FIX_AT = FIX_AT;

const Preview: React.FC<{ fixed: number; w: number; h: number }> = ({ fixed, w, h }) => (
  <div style={{ position: 'relative', width: w, height: h, borderRadius: 10, overflow: 'hidden', background: R.tile }}>
    <Img src={staticFile('people/sofia.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(10px)', transform: 'scale(1.06)' }} />
    <Img
      src={staticFile('people/sofia.jpg')}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: fixed,
        WebkitMaskImage: 'radial-gradient(ellipse 24% 62% at 50% 58%, #000 55%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 24% 62% at 50% 58%, #000 55%, transparent 100%)',
      }}
    />
    <div style={{ position: 'absolute', left: 10, bottom: 10, padding: '4px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 14 }}>You</div>
  </div>
);

export const Tablet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
  const fixed = fade(frame, FIX_AT, FIX_AT + 14);
  const TB = { w: 1180, h: 820, x: 370, y: 130 };
  const sc = { x: TB.x + 22, y: TB.y + 22, w: TB.w - 44, h: TB.h - 44 };
  const tiles = [
    { label: 'No background', kind: 'none' },
    { label: 'Light blur', kind: 'light' },
    { label: 'Strong blur', kind: 'strong' },
    { label: 'Upload custom background', kind: 'upload' },
  ];
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: RFONT, opacity: intro }}>
      <div style={{ position: 'absolute', left: TB.x, top: TB.y, width: TB.w, height: TB.h, borderRadius: 40, background: '#111', boxShadow: '0 40px 90px rgba(10,15,40,0.4), 0 0 0 2px #333' }} />
      <div style={{ position: 'absolute', left: sc.x, top: sc.y, width: sc.w, height: sc.h, borderRadius: 24, background: '#000', overflow: 'hidden' }}>
        <Img src={staticFile('logo_mono.svg')} style={{ position: 'absolute', left: 28, top: 22, height: 22, filter: 'brightness(0) invert(1)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 22, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>Weekly product sync</div>
        <div style={{ position: 'absolute', left: 40, top: 70, width: 700, fontSize: 18, color: '#fff', fontWeight: 500 }}>Virtual background</div>
        <div style={{ position: 'absolute', left: 40, top: 104 }}>
          <Preview fixed={fixed} w={700} h={466} />
        </div>
        <div style={{ position: 'absolute', left: 780, top: 104, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tiles.map((t) => {
            const on = t.kind === 'strong';
            return (
              <div key={t.kind} style={{ width: 150, height: 100, borderRadius: 8, overflow: 'hidden', position: 'relative', background: R.tile, boxSizing: 'border-box', border: on ? `3px solid ${PRIMARY_DARK}` : '3px solid transparent' }}>
                {t.kind !== 'upload' && (
                  <Img src={staticFile('people/sofia.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: t.kind === 'none' ? undefined : t.kind === 'light' ? 'blur(3px)' : 'blur(7px)', opacity: 0.85 }} />
                )}
                {t.kind === 'upload' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 34 }}>+</div>}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '4px 8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 780, top: 340, width: 320, fontSize: 14, lineHeight: 1.45, color: 'rgba(255,255,255,0.7)' }}>
          Strong blur keeps you sharp and softens the room behind you.
        </div>
        <div style={{ position: 'absolute', left: 40, top: 596, display: 'flex', gap: 12 }}>
          {['camera', 'mic', 'settings'].map((n) => (
            <div key={n} style={{ width: 44, height: 44, borderRadius: 22, background: n === 'settings' ? R.primaryLight : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RIcon name={n as 'camera'} size={30} color="#fff" />
            </div>
          ))}
        </div>
      </div>
      <Pill text={fixed > 0.5 ? 'Fixed: you stay sharp, the room blurs' : 'Before: the whole picture blurred'} opacity={1} bottom={40} />
      <div style={{ position: 'absolute', left: 24, bottom: 16, fontSize: 18, color: 'rgba(50,63,102,0.55)' }}>People shown are AI-generated · Android tablet</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Fix 3: avatar fits the pinned audio tile. TiledWithContent/RoomGrid.tsx: content column 80% by default, 35-90%,
// side strip at least 166px; avatar clamps to min(size, max(100cqmin - 32px, 60cqmin)) (SAMBA-9220)
// ---------------------------------------------------------------------------
export const PINNED_LEN = 260;
const DRAG = { start: 140, end: 190 }; // 'however small it gets' (@144-169)
export const PINNED_CLICKS = [DRAG.start];

const st = stageRect(false);
const GAP = 4;
const HANDLE = 10;
const MIN_STRIP = 166;
const ratioAt = (frame: number) => interpolate(frame, [DRAG.start, DRAG.end], [0.8, (st.w - MIN_STRIP - HANDLE) / st.w], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t * (3 - 2 * t) });
const handleX = (ratio: number) => st.x + ratio * st.w + HANDLE / 2;

const PATH = [
  { f: 0, x: 700, y: 650 },
  { f: 90, x: 700, y: 650 },
  { f: 120, x: handleX(0.8), y: 430 },
  { f: DRAG.start, x: handleX(0.8), y: 430 },
  { f: DRAG.end, x: handleX(ratioAt(DRAG.end)), y: 430 },
  { f: DRAG.end + 20, x: handleX(ratioAt(DRAG.end)), y: 430 },
  { f: DRAG.end + 50, x: handleX(ratioAt(DRAG.end)) + 60, y: 520 },
];
const CAMERA = [
  { f: 0, z: 1, x: 720, y: 405 },
  { f: 40, z: 1, x: 720, y: 405 },
  { f: 70, z: 1.3, x: 1100, y: 330 },
  { f: 200, z: 1.3, x: 1100, y: 330 },
  { f: 226, z: 2.1, x: 1300, y: 170 },
  { f: 260, z: 2.1, x: 1300, y: 170 },
];

// After the fix the avatar never exceeds the tile: 100cqmin - 32px, with a 60cqmin floor
const avatarSize = (w: number, h: number) => {
  const cqmin = Math.min(w, h);
  return Math.min(120, Math.max(cqmin - 32, cqmin * 0.6));
};

const AudioTile: React.FC<{ w: number; h: number; name: string; color: string; pinned?: boolean; pinHover?: boolean }> = ({ w, h, name, color, pinned, pinHover }) => {
  const a = avatarSize(w, h);
  return (
    <div style={{ position: 'relative', width: w, height: h, background: R.tile, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: (w - a) / 2, top: (h - a) / 2, width: a, height: a, borderRadius: '50%', background: color, color: '#fff', fontSize: a * 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {initials(name)}
      </div>
      <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', height: 22, padding: '0 10px', borderRadius: 11, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', maxWidth: w - 16, overflow: 'hidden' }}>
        {name}
      </div>
      <div style={{ position: 'absolute', left: 6, bottom: 6, width: 26, height: 26, borderRadius: 13, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RIcon name="mic" size={20} color={R.speaking} />
      </div>
      {pinned && (
        <div style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, background: pinHover ? R.primary : 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RIcon name="pin" size={18} color="#fff" />
        </div>
      )}
    </div>
  );
};

const SharedSlide: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <div style={{ width: w, height: h, background: '#fff', borderRadius: 8, overflow: 'hidden', position: 'relative', fontFamily: RFONT, color: '#323F66' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 10, background: '#3771e0' }} />
    <div style={{ position: 'absolute', left: 60, top: 60, fontSize: 40, fontWeight: 700 }}>Q4 roadmap</div>
    <div style={{ position: 'absolute', left: 60, top: 120, fontSize: 20, color: '#6b7390' }}>Customer success · review</div>
    {[0.82, 0.64, 0.5, 0.36].map((v, i) => (
      <div key={i} style={{ position: 'absolute', left: 60, top: 190 + i * 90, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 200, fontSize: 20 }}>{['Onboarding', 'Integrations', 'Reporting', 'Mobile'][i]}</div>
        <div style={{ width: (w - 360) * v, height: 34, borderRadius: 6, background: i === 0 ? '#3771e0' : '#9bb8f0' }} />
        <div style={{ fontSize: 18, color: '#6b7390' }}>{Math.round(v * 100)}%</div>
      </div>
    ))}
  </div>
);

export const Pinned: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = cursorPos(frame, PATH);
  const ratio = ratioAt(frame);
  const contentW = ratio * st.w - HANDLE / 2;
  const stripX = st.x + ratio * st.w + HANDLE / 2;
  const stripW = st.x + st.w - stripX;
  const tileH = Math.round(stripW * 0.75);
  const dragging = frame >= DRAG.start && frame <= DRAG.end;
  const handleHover = dragging || near(cur, { x: handleX(ratio), y: 430 }, 16, 400);
  const others = ['elena', 'matthias', 'jonas', 'julien'].map(byId);
  const sofia = byId('sofia');
  return (
    <Stage url="app.digitalsamba.com/acme/weekly-product-sync" camera={CAMERA} path={PATH} clicks={PINNED_CLICKS} aiNote>
      <RoomChrome roomName="Weekly product sync" activeTool="share-screen">
        <div style={{ position: 'absolute', left: st.x, top: st.y }}>
          <SharedSlide w={contentW} h={st.h} />
        </div>
        {/* drag handle */}
        <div style={{ position: 'absolute', left: st.x + ratio * st.w - HANDLE / 2, top: st.y, width: HANDLE, height: st.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 4, height: 48, borderRadius: 2, background: handleHover ? R.primary : 'rgba(255,255,255,0.35)' }} />
        </div>
        {/* tile strip, pinned audio tile first */}
        <div style={{ position: 'absolute', left: stripX, top: st.y, width: stripW, height: st.h, display: 'flex', flexDirection: 'column', gap: GAP, overflow: 'hidden' }}>
          <AudioTile w={stripW} h={tileH} name={sofia.name} color={sofia.color} pinned pinHover={near(cur, { x: stripX + stripW - 19, y: st.y + 19 }, 16, 16)} />
          {others.map((p) => (
            <div key={p.id} style={{ position: 'relative', width: stripW, height: tileH, borderRadius: 8, overflow: 'hidden', background: R.tile, flexShrink: 0 }}>
              <Img src={staticFile(`people/${p.img}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', height: 22, padding: '0 10px', borderRadius: 11, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                {p.name}
              </div>
            </div>
          ))}
        </div>
      </RoomChrome>
    </Stage>
  );
};
