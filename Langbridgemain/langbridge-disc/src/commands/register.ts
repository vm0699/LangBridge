import "dotenv/config";
import { REST } from "discord.js";
import { registerAll } from "./definitions.js";

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  await registerAll(rest, process.env.DISCORD_APP_ID!, process.env.DISCORD_GUILD_ID);
  console.log("✅ Commands registered");
})();
