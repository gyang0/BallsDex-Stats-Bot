const { SlashCommandBuilder } = require("discord.js");

// Environment variables
require('dotenv').config();


module.exports = {
    data: new SlashCommandBuilder()
        .setName('getballs')
        .setDescription('Gets data for balls'),

    // https://stackoverflow.com/questions/63322284/discord-js-get-an-array-of-all-messages-in-a-channel
    // Getting a list of all messages in the channel
    async execute(interaction) {
        const channel = interaction.client.channels.cache.get(process.env.CHANNEL_ID);
        let messages = [];

        // Create message pointer
        let message = await channel.messages
            .fetch({ limit: 1 })
            .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));


        while (message) {
            await channel.messages
                .fetch({ limit: 100, before: message.id })
                .then(messagePage => {
                    messagePage.forEach(msg => messages.push(msg));

                    // Update our message pointer to be the last message on the page of messages
                    message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
                });
        }


        // Conditions for filtering messages
        // 1. Must be from BallsDex
        // 2. Must have image attachment
        const msgs = messages
            .filter(m => {
                return m.author.id === process.env.BALLSDEX_USER_ID;
            })
            .filter(m => {
                // Must be an image attachment
                if(m.attachments.size > 0){
                    m.attachments.forEach(attachment => {
                        if(!attachment.contentType.includes("image/"))
                            return false;
                    })
                }

                return true;
            });

    }
};
