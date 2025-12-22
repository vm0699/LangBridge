import fs from "fs";

type Mode = "reply" | "replace";

type State = {
  users: Record<string, string>;
  channels: Record<string, string>;
  servers: Record<string, string>;
  autotranslate: Record<string, boolean>;
  autotranslateMode: Record<string, Mode>;
};

const FILE = ".prefs.json";

function load(): State {
  if (!fs.existsSync(FILE)) {
    return {
      users: {},
      channels: {},
      servers: {},
      autotranslate: {},
      autotranslateMode: {}, // ensure present on first run
    };
  }
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  // ---- migration / hardening ----
  raw.users ??= {};
  raw.channels ??= {};
  raw.servers ??= {};
  raw.autotranslate ??= {};
  raw.autotranslateMode ??= {};               // <— make sure it exists
  return raw as State;
}

let s: State = load();
const save = () => fs.writeFileSync(FILE, JSON.stringify(s, null, 2));

export const Prefs = {
  setUserLang(id: string, lang: string) { s.users[id] = lang; save(); },
  getUserLang(id: string) { return s.users[id]; },

  setChannelLang(id: string, lang: string) { s.channels[id] = lang; save(); },
  getChannelLang(id: string) { return s.channels[id]; },

  setServerLang(id: string, lang: string) { s.servers[id] = lang; save(); },
  getServerLang(id: string) { return s.servers[id]; },

  setAuto(channelId: string, on: boolean) { s.autotranslate[channelId] = on; save(); },
  isAuto(channelId: string) { return !!s.autotranslate[channelId]; },

  // mode helpers (reply | replace)
  setMode(channelId: string, mode: Mode) { s.autotranslateMode[channelId] = mode; save(); },
  getMode(channelId: string): Mode { return s.autotranslateMode[channelId] ?? "reply"; },
};
