import fs from "fs";

type State = {
  users: Record<string,string>;
  channels: Record<string,string>;
  servers: Record<string,string>;
  autotranslate: Record<string,boolean>;
};

const FILE = ".prefs.json";
let s: State = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE,"utf8")) :
  { users:{}, channels:{}, servers:{}, autotranslate:{} };

const save = () => fs.writeFileSync(FILE, JSON.stringify(s, null, 2));

export const Prefs = {
  setUserLang(id: string, lang: string){ s.users[id]=lang; save(); },
  getUserLang(id: string){ return s.users[id]; },
  setChannelLang(id: string, lang: string){ s.channels[id]=lang; save(); },
  getChannelLang(id: string){ return s.channels[id]; },
  setServerLang(id: string, lang: string){ s.servers[id]=lang; save(); },
  getServerLang(id: string){ return s.servers[id]; },
  setAuto(channelId: string, on: boolean){ s.autotranslate[channelId]=on; save(); },
  isAuto(channelId: string){ return !!s.autotranslate[channelId]; }
};
