import { REST, Routes, SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

export const slash = [
  new SlashCommandBuilder().setName("lang")
    .setDescription("Set or show your language")
    .addSubcommand(sc => sc.setName("set")
      .setDescription("Set your language (e.g., en, ta, hi)")
      .addStringOption(o => o.setName("code").setDescription("ISO code").setRequired(true)))
    .addSubcommand(sc => sc.setName("show")
      .setDescription("Show your language")),
  new SlashCommandBuilder().setName("autotranslate")
    .setDescription("Enable/disable auto-translate in this channel")
    .addStringOption(o => o.setName("mode").setDescription("on/off").setRequired(true)
      .addChoices({name:"on", value:"on"}, {name:"off", value:"off"})),
  new SlashCommandBuilder().setName("default")
    .setDescription("Set default language")
    .addStringOption(o => o.setName("scope").setDescription("server|channel").setRequired(true)
      .addChoices({name:"server", value:"server"}, {name:"channel", value:"channel"}))
    .addStringOption(o => o.setName("code").setDescription("ISO code").setRequired(true))
].map(c => c.toJSON());

export const context = [
  new ContextMenuCommandBuilder()
    .setName("Translate to my language")
    .setType(ApplicationCommandType.Message)
    .toJSON()
];

export async function registerAll(rest: REST, appId: string, guildId?: string) {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: [...slash, ...context] });
  } else {
    await rest.put(Routes.applicationCommands(appId), { body: [...slash, ...context] });
  }
}
