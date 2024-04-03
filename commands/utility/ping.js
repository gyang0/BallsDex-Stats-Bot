const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Pings the bot'),

	async execute(interaction){
		await interaction.reply("Pong!");
	}
};
