import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage, cursorPos, fade, near } from '../Stage';
import { RoomChrome, TileGrid, stageRect } from '../room/Room';
import { PEOPLE } from '../room/people';
import { R, RFONT } from '../room/theme';
import { RIcon } from '../room/icons';

// "Transcription language applies to everyone by default": react-frontend settings/tabs/CaptionsTab.tsx
// (SAMBA-9678 renames the tab, SAMBA-9679 flips applySpokenLanguageToAll to true). Strings from settings:captions.*
export const TRANS_LEN = 480;
// Click frames sit on the words that name them (01b: 'language' @144, 'Apply' @198; 01c: 'off' @365)
const C_ = { settings: 70, tab: 100, lang: 144, pick: 176, off: 365 };
export const TRANS_CLICKS = Object.values(C_);

// Settings dialog geometry (MUI Dialog maxWidth md, themed to 700px; tabs column 210 + 2rem; panel max 376)
const DLG = { x: 370, y: 110, w: 700, h: 520 };
const TABS = ['Workspace', 'Video', 'Audio', 'Virtual background', 'Transcription', 'Security', 'Components', 'Clear content'];
const TAB_Y = (i: number) => DLG.y + 80 + i * 41;
const PANEL_X = DLG.x + 24 + 210 + 32; // 636
const PANEL_W = 376;
const LANGS = ['Bulgarian', 'Catalan', 'Danish', 'English', 'Finnish', 'French', 'German', 'Romanian', 'Italian', 'Dutch', 'Portuguese', 'Spanish', 'Swedish', 'Turkish'];
const MENU = { x: PANEL_X, y: DLG.y + 144, w: PANEL_W, item: 36 };
const PICK = 'German';

// Click targets (canvas px)
const settingsBtn = { x: 48, y: 716 };
const transTab = { x: PANEL_X - 32 - 210 + 70, y: TAB_Y(4) + 20 };
const langSelect = { x: PANEL_X + 180, y: DLG.y + 114 };
const germanItem = { x: MENU.x + 80, y: MENU.y + 8 + LANGS.indexOf(PICK) * MENU.item + 18 };
const applySwitch = { x: PANEL_X + PANEL_W - 18, y: DLG.y + 214 };

const PATH = [
  { f: 0, x: 900, y: 600 },
  { f: 40, x: 900, y: 600 },
  { f: 66, ...settingsBtn },
  { f: 84, ...settingsBtn },
  { f: 98, ...transTab },
  { f: 118, ...transTab },
  { f: 138, ...langSelect },
  { f: 160, ...langSelect },
  { f: 172, ...germanItem },
  { f: 215, ...germanItem },
  { f: 250, ...applySwitch },
  { f: 385, ...applySwitch },
  { f: 415, x: applySwitch.x - 60, y: applySwitch.y + 120 },
];

const CAMERA = [
  { f: 0, z: 1, x: 720, y: 405 },
  { f: 74, z: 1, x: 720, y: 405 },
  { f: 100, z: 1.45, x: 720, y: 380 },
  { f: 150, z: 1.45, x: 720, y: 380 },
  { f: 172, z: 1.45, x: 740, y: 460 },
  { f: 190, z: 1.45, x: 740, y: 460 },
  { f: 216, z: 1.9, x: 830, y: 330 },
  { f: 405, z: 1.9, x: 830, y: 330 },
  { f: 445, z: 1.45, x: 720, y: 380 },
];

// Themed MUI switch (36x22, thumb 16): on = primary track, white thumb; off = white track, #c5c5c5 thumb and border
const RSwitch: React.FC<{ on: boolean; hover?: boolean }> = ({ on, hover }) => (
  <div
    style={{
      width: 36,
      height: 22,
      borderRadius: 36,
      boxSizing: 'border-box',
      border: `1px solid ${on ? R.primary : '#c5c5c5'}`,
      background: on ? R.primary : '#fff',
      position: 'relative',
      boxShadow: hover ? `0 0 0 6px rgba(55,113,224,0.12)` : 'none',
    }}
  >
    <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: on ? '#fff' : '#c5c5c5' }} />
  </div>
);

// MUI outlined Select with a floating label
const Select: React.FC<{ x: number; y: number; w: number; label: string; value: string; open?: boolean; hover?: boolean }> = ({ x, y, w, label, value, open, hover }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: 56,
      boxSizing: 'border-box',
      border: open ? `2px solid ${R.primary}` : `1px solid ${hover ? 'rgba(0,0,0,0.87)' : 'rgba(0,0,0,0.23)'}`,
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      fontSize: 16,
      color: R.text,
    }}
  >
    <div style={{ position: 'absolute', left: 9, top: -8, padding: '0 5px', background: R.paper, fontSize: 12, color: open ? R.primary : R.text2 }}>{label}</div>
    <span style={{ flex: 1 }}>{value}</span>
    <RIcon name="dropdown-arrow" size={24} color="rgba(0,0,0,0.54)" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
  </div>
);

const SettingsDialog: React.FC<{ opacity: number; tab: number; tabHover: boolean; lang: string; menu: number; menuHover: string | null; apply: boolean; switchHover: boolean; selectHover: boolean }> = ({
  opacity,
  tab,
  tabHover,
  lang,
  menu,
  menuHover,
  apply,
  switchHover,
  selectHover,
}) => {
  if (opacity <= 0) return null;
  const transcription = tab === 4;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.5 * opacity})`, zIndex: 30 }} />
      <div
        style={{
          position: 'absolute',
          left: DLG.x,
          top: DLG.y,
          width: DLG.w,
          height: DLG.h,
          background: R.paper,
          borderRadius: 4,
          boxShadow: '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14)',
          opacity,
          transform: `scale(${0.94 + 0.06 * opacity})`,
          fontFamily: RFONT,
          color: R.text,
          zIndex: 31,
        }}
      >
        <div style={{ position: 'absolute', left: 24, top: 20, fontSize: 20, fontWeight: 500 }}>Settings</div>
        <RIcon name="close" size={24} color="rgba(0,0,0,0.54)" style={{ position: 'absolute', right: 20, top: 18 }} />
        {/* Vertical tabs */}
        {TABS.map((t, i) => {
          const on = i === tab;
          return (
            <div
              key={t}
              style={{
                position: 'absolute',
                left: 24,
                top: TAB_Y(i) - DLG.y,
                width: 210,
                height: 41,
                boxSizing: 'border-box',
                padding: '10px 16px',
                fontSize: 16,
                color: on ? R.primary : R.text,
                background: i === 4 && tabHover && !on ? 'rgba(0,0,0,0.04)' : 'transparent',
                borderRadius: 4,
              }}
            >
              {t}
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 24 + 210, top: 70, width: 1, height: DLG.h - 100, background: '#c5c5c5' }} />
        {/* Transcription panel (TabPanelInner, Stack spacing 5) */}
        {transcription && (
          <>
            <Select x={PANEL_X - DLG.x} y={86} w={PANEL_W} label="Spoken language" value={lang} open={menu > 0} hover={selectHover} />
            <div style={{ position: 'absolute', left: PANEL_X - DLG.x, top: 148, fontSize: 12, color: R.text2 }}>Select the language you speak for accurate transcription.</div>
            <div style={{ position: 'absolute', left: PANEL_X - DLG.x, top: 190, width: PANEL_W, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16 }}>Apply to everyone</div>
                <div style={{ fontSize: 12, color: R.text2, marginTop: 4, width: 300 }}>Use this language for all participants, overriding their settings.</div>
              </div>
              <div style={{ marginTop: 3 }}>
                <RSwitch on={apply} hover={switchHover} />
              </div>
            </div>
            <Select x={PANEL_X - DLG.x} y={266} w={PANEL_W} label="Caption size" value="Medium" />
          </>
        )}
        {!transcription && (
          <div style={{ position: 'absolute', left: PANEL_X - DLG.x, top: 86, width: PANEL_W, fontSize: 16, color: R.text2 }}>
            <div style={{ height: 56, border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4, marginBottom: 40 }} />
            <div style={{ height: 56, border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4, marginBottom: 40 }} />
            <div style={{ height: 56, border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4 }} />
          </div>
        )}
      </div>
      {/* Language menu (MUI Menu, max-height 500) */}
      {menu > 0 && (
        <div
          style={{
            position: 'absolute',
            left: MENU.x,
            top: MENU.y,
            width: MENU.w,
            maxHeight: 500,
            overflow: 'hidden',
            boxSizing: 'border-box',
            padding: '8px 0',
            background: R.paper,
            borderRadius: 4,
            boxShadow: '0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12)',
            opacity: menu,
            transform: `scaleY(${0.9 + 0.1 * menu})`,
            transformOrigin: 'top',
            fontFamily: RFONT,
            zIndex: 40,
          }}
        >
          {LANGS.map((l) => (
            <div
              key={l}
              style={{
                height: MENU.item,
                boxSizing: 'border-box',
                padding: '6px 16px',
                fontSize: 16,
                color: R.text,
                background: l === lang ? 'rgba(55,113,224,0.08)' : l === menuHover ? 'rgba(0,0,0,0.04)' : 'transparent',
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const Transcription: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = cursorPos(frame, PATH);
  const dlg = fade(frame, C_.settings + 3, C_.settings + 11);
  const tab = frame >= C_.tab + 2 ? 4 : 0;
  const menu = frame >= C_.pick + 1 ? 0 : fade(frame, C_.lang + 2, C_.lang + 8);
  const lang = frame >= C_.pick + 1 ? PICK : 'English';
  const apply = frame < C_.off + 2;
  const hoverLang = menu > 0 ? LANGS.find((_, i) => near(cur, { x: MENU.x + MENU.w / 2, y: MENU.y + 8 + i * MENU.item + 18 }, MENU.w / 2, MENU.item / 2)) ?? null : null;
  const st = stageRect(false);
  const tiles = PEOPLE.map((person) => ({ person, camOff: person.you, speaking: person.id === 'elena' }));

  return (
    <Stage url="app.digitalsamba.com/acme/weekly-product-sync" camera={CAMERA} path={PATH} clicks={TRANS_CLICKS} aiNote>
      <RoomChrome activeTool={frame >= C_.settings ? 'settings' : undefined} roomName="Weekly product sync">
        <TileGrid tiles={tiles} x={st.x} y={st.y} w={st.w} h={st.h} cols={3} />
        <SettingsDialog
          opacity={dlg}
          tab={tab}
          tabHover={near(cur, transTab, 100, 20)}
          lang={lang}
          menu={menu}
          menuHover={hoverLang}
          apply={apply}
          switchHover={near(cur, applySwitch, 30, 20)}
          selectHover={menu === 0 && near(cur, { x: PANEL_X + PANEL_W / 2, y: langSelect.y }, PANEL_W / 2, 28)}
        />
      </RoomChrome>
    </Stage>
  );
};

