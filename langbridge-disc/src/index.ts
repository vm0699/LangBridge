import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, InteractionType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { translate } from "./translator";
import { Prefs } from "./prefs";


const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const originals = new Map<string,string>(); // buttonId -> original text

function targetFor(userId: string, channelId?: string, guildId?: string) {
  return (
    Prefs.getUserLang(userId) ||
    (channelId ? Prefs.getChannelLang(channelId) : undefined) ||
    (guildId ? Prefs.getServerLang(guildId) : undefined) ||
    process.env.DEFAULT_TARGET_LANG || "en"
  );
}

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (ix) => {
  // slash commands
  if (ix.isChatInputCommand()) {
    if (ix.commandName === "lang") {
      const sub = ix.options.getSubcommand();
      if (sub === "set") {
        const code = ix.options.getString("code", true).trim().toLowerCase();
        Prefs.setUserLang(ix.user.id, code);
        await ix.reply({ ephemeral: true, content: `✅ Your language set to **${code}**` });
      } else {
        const code = targetFor(ix.user.id, ix.channelId!, ix.guildId!);
        await ix.reply({ ephemeral: true, content: `🌐 Your language: **${code}**` });
      }
    }
    if (ix.commandName === "autotranslate") {
      const mode = ix.options.getString("mode", true);
      Prefs.setAuto(ix.channelId!, mode === "on");
      await ix.reply({ content: `🔁 Auto-translate **${mode.toUpperCase()}** in this channel.` });
    }
    if (ix.commandName === "default") {
      const scope = ix.options.getString("scope", true);
      const code = ix.options.getString("code", true).trim().toLowerCase();
      if (scope === "server" && ix.guildId) {
        Prefs.setServerLang(ix.guildId, code);
        await ix.reply({ content: `🏛️ Server default language set to **${code}**` });
      } else {
        Prefs.setChannelLang(ix.channelId!, code);
        await ix.reply({ content: `#️⃣ Channel default language set to **${code}**` });
      }
    }
  }

  // context menu
  if (ix.isMessageContextMenuCommand()) {
    const target = targetFor(ix.user.id, ix.channelId!, ix.guildId!);
    const original = ix.targetMessage.content ?? "";
    if (!original) { await ix.reply({ ephemeral: true, content: "Empty message." }); return; }
    await ix.deferReply({ ephemeral: true });
    try {
      const t = await translate(original, { targetLang: target });
      await ix.editReply(`🌐 *Translated from ${t.detectedLang}* → **${target}**\n${t.text}`);
    } catch (e:any) {
      await ix.editReply(`❌ Translate failed: ${e.message}`);
    }
  }

  // "Show original" button
  if (ix.type === InteractionType.MessageComponent && ix.isButton() && ix.customId.startsWith("show_")) {
    const key = ix.customId;
    const original = originals.get(key);
    await ix.reply({ ephemeral: true, content: original ? `📝 Original:\n${original}` : "Original not available." });
  }
});

// auto-translate layer
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;
  if (!Prefs.isAuto(msg.channelId)) return;

  const target = targetFor(msg.author.id, msg.channelId, msg.guildId!);
  try {
    const t = await translate(msg.content, { targetLang: target });
    const btnId = `show_${msg.id}_${Date.now()}`;
    originals.set(btnId, msg.content);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(btnId).setLabel("Show original").setStyle(ButtonStyle.Secondary)
    );

    await msg.reply({
      content: `🌐 *Translated from ${t.detectedLang}* → **${target}**\n${t.text}`,
      components: [row]
    });

    // optional: clean old cache entries
    setTimeout(() => originals.delete(btnId), 10 * 60 * 1000);
  } catch {
    // Soft fail: keep silent
  }
});

client.login(process.env.DISCORD_TOKEN);
