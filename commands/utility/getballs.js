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
        interaction.reply("this may take a while, please wait a few minutes...");

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
        // 3. Must have content "A wild countryball appeared!"
        const msgs = messages
            .filter(m => {
                return m.author.id === process.env.BALLSDEX_USER_ID;
            })
            .filter(m => {
                return m.content === "A wild countryball appeared!";
            })
            /*.filter(m => {
                // Must be an image attachment
                if(m.attachments.size == 1){
                    m.attachments.forEach(attachment => {
                        if(!attachment.contentType.includes("image/"))
                            return false;
                    })
                }

                return true;
            });*/

        channel.send("There are " + msgs.length + " BallsDex spawns in this channel.");

        //console.log(msgs.length);

        // Todo: make this ping the user who sent the message
        //channel.send("There are " + msgs.length + " BallsDex spawns in this channel");

        /*// These messages are the ones that have an attachment
        for(let i = 0; i < msgs.length; i++){
            // BallsDex spawns have 1 image attachment
            if(m)
        }*/

        //await interaction.reply("Data length: " + messages.length);

    }
};
