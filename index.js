// Node file paths
const fs = require("node:fs");
const path = require("node:path");

// Environment variables
require('dotenv').config();

// Discord.js setup
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');

// Client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });


// Get slash commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const cmdFolders = fs.readdirSync(foldersPath);


// Iterating folders to populate commands list
for(const folder of cmdFolders){
	const cmdPath = path.join(foldersPath, folder);
	const cmdFiles = fs.readdirSync(cmdPath).filter(file => file.endsWith(".js"));

	// Iterating files
	for(const file of cmdFiles){
		const filePath = path.join(cmdPath, file);
		const command = require(filePath);

		// Make an entry in client.commands for the slash command
		if('data' in command && 'execute' in command){
			client.commands.set(command.data.name, command);
		} else {
			console.log(`Command at ${filePath} is missing the required 'data' or 'execute' property.`);
		}
	}
}


// Runs when client is ready
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready - Logged in as ${readyClient.user.tag}`);
});

// Log into Discord
client.login(process.env.BOT_TOKEN);


client.on(Events.InteractionCreate, async interaction => {
	// Not a slash command
	if(!interaction.isChatInputCommand())
		return;
	
	const command = interaction.client.commands.get(interaction.commandName);
	
	// Not valid command
	if(!command){
		console.log(`No such command matching ${interaction.commandName}`);
		return;
	}

	// Execute command
	try {
		await command.execute(interaction);
	} catch (err){
		console.log(err);

		// For more detailed logs
		if(interaction.replied || interaction.deferred){
			await interaction.followUp({ content: "Error while executing command", ephemeral: true });
		} else {
			await interaction.reply({ content: "Error while executing command", ephemeral: true });
		}
	}

	//console.log(interaction);
})
