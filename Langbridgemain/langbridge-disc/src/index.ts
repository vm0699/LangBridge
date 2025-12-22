import "dotenv/config";
import {
  Client, GatewayIntentBits, Partials, Events,
  InteractionType, ButtonBuilder, ButtonStyle, ActionRowBuilder,
  TextChannel, Webhook
} from "discord.js";
import { translate } from "./translator";
import { Prefs } from "./prefs";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // <-- MUST be enabled in Dev Portal too
  ],
  partials: [Partials.Channel],
});

const originals = new Map<string, string>(); // buttonId -> original text
const webhookCache = new Map<string, Webhook>();

function targetFor(userId: string, channelId?: string, guildId?: string) {
  return (
    Prefs.getUserLang(userId) ||
    (channelId ? Prefs.getChannelLang(channelId) : undefined) ||
    (guildId ? Prefs.getServerLang(guildId) : undefined) ||
    process.env.DEFAULT_TARGET_LANG ||
    "en"
  );
}

async function ensureChannelWebhook(channel: any) {
  const text = channel as TextChannel;
  if (!text || typeof text.fetchWebhooks !== "function") throw new Error("Not a text channel");

  let hook = webhookCache.get(text.id);
  if (hook) return hook;

  const hooks = await text.fetchWebhooks();
  hook =
    hooks.find((h) => h.owner?.id === client.user?.id) ||
    (await text.createWebhook({ name: "LangBridge Relay" }));
  webhookCache.set(text.id, hook);
  return hook;
}

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);
  console.log(`[BOOT] LB_ENDPOINT=${process.env.LB_ENDPOINT}`);
  // probe the translator health
  try {
    const r = await fetch(String(process.env.LB_ENDPOINT).replace("/v1/translate", "/health"));
    console.log(`[BOOT] /health -> ${r.status}`);
  } catch (e: any) {
    console.log(`[BOOT] /health error -> ${e?.message}`);
  }
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
      console.log(`[CMD] autotranslate ${mode} for channel ${ix.channelId}`);
      await ix.reply({ content: `🔁 Auto-translate **${mode.toUpperCase()}** in this channel.` });
    }

    if (ix.commandName === "default") {
      const scope = ix.options.getString("scope", true);
      const code = ix.options.getString("code", true).trim().toLowerCase();
      if (scope === "server" && ix.guildId) {
        Prefs.setServerLang(ix.guildId, code);
        console.log(`[CMD] server default ${ix.guildId} -> ${code}`);
        await ix.reply({ content: `🏛️ Server default language set to **${code}**` });
      } else {
        Prefs.setChannelLang(ix.channelId!, code);
        console.log(`[CMD] channel default ${ix.channelId} -> ${code}`);
        await ix.reply({ content: `#️⃣ Channel default language set to **${code}**` });
      }
    }

    if (ix.commandName === "mode") {
      const value = ix.options.getString("value", true) as "reply" | "replace";
      Prefs.setMode(ix.channelId!, value);
      console.log(`[CMD] mode ${value} for channel ${ix.channelId}`);
      await ix.reply({ content: `⚙️ Mode for this channel set to **${value}**.` });
    }
  }

  // context menu translation
  if (ix.isMessageContextMenuCommand()) {
    const target = targetFor(ix.user.id, ix.channelId!, ix.guildId!);
    const original = ix.targetMessage.content ?? "";
    if (!original) {
      await ix.reply({ ephemeral: true, content: "Empty message." });
      return;
    }
    await ix.deferReply({ ephemeral: true });
    try {
      console.log(`[CTX] translate -> target=${target} len=${original.length}`);
      const t = await translate(original, { targetLang: target });
      await ix.editReply(`🌐 *Translated from ${t.detectedLang}* → **${target}**\n${t.text}`);
    } catch (e: any) {
      console.error(`[CTX] translate failed`, e);
      await ix.editReply(`❌ Translate failed: ${e.message}`);
    }
  }

  // “Show original” button
  if (ix.type === InteractionType.MessageComponent && ix.isButton() && ix.customId.startsWith("show_")) {
    const key = ix.customId;
    const original = originals.get(key);
    await ix.reply({ ephemeral: true, content: original ? `📝 Original:\n${original}` : "Original not available." });
  }
});

// AUTO-TRANSLATE LAYER
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const channelId = msg.channelId;
  if (!Prefs.isAuto(channelId)) return;

  const mode = Prefs.getMode(channelId); // "reply" | "replace"
  const target = targetFor(msg.author.id, channelId, msg.guildId!);
  console.log(`[MSG] auto mode=${mode} target=${target} text="${msg.content}"`);

  try {
    const t = await translate(msg.content, { targetLang: target });

    if (mode === "replace") {
      try {
        const hook = await ensureChannelWebhook(msg.channel);
        await hook.send({
          content: `${t.text}`,
          username: msg.member?.displayName || msg.author.username,
          avatarURL: msg.author.displayAvatarURL(),
        });
        await msg.delete().catch(() => {});
      } catch (e) {
        console.error(`[MSG] replace mode failed, falling back`, e);
        await msg.reply(`🌐 ${t.text}`);
      }
      return;
    }

    // Default: reply mode
    const btnId = `show_${msg.id}_${Date.now()}`;
    originals.set(btnId, msg.content);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(btnId).setLabel("Show original").setStyle(ButtonStyle.Secondary)
    );

    await msg.reply({
      content: `🌐 *Translated from ${t.detectedLang}* → **${target}**\n${t.text}`,
      components: [row],
    });
    setTimeout(() => originals.delete(btnId), 10 * 60 * 1000);
  } catch (e: any) {
    console.error(`[MSG] translate failed -> ${e?.message}`, e);
  }
});

client.login(process.env.DISCORD_TOKEN);
