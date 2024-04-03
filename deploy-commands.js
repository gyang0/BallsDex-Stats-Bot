// REST API
const { REST, Routes } = require('discord.js');

// Node file paths
const fs = require('node:fs');
const path = require('node:path');

// Environment variables
require('dotenv').config();

// Array of commands
const commands = [];

// Get list of commands from commands folder
const foldersPath = path.join(__dirname, 'commands');
const cmdFolders = fs.readdirSync(foldersPath);

// Iterate folders
for (const folder of cmdFolders) {
	const cmdPath = path.join(foldersPath, folder);
	const cmdFiles = fs.readdirSync(cmdPath).filter(file => file.endsWith('.js'));
	
	// Iterate files
	for (const file of cmdFiles) {
		const filePath = path.join(cmdPath, file);
		const command = require(filePath);
		
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`Command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Make instance of REST module
const rest = new REST().setToken(process.env.BOT_TOKEN);

// Deploy commands
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// Refresh all commands in guild
		const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);

	} catch (error) {
		console.log(error);
	}
})();