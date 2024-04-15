const { SlashCommandBuilder } = require("discord.js");
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const jimp = require("jimp");

// Environment variables
require('dotenv').config();


// https://www.youtube.com/watch?v=FKbC83Te1Xw
// Converts an image URL to an image buffer with jimp
const urlToBuffer = async (url) => {
    return new Promise(async (resolve, reject) => {
        // Read image with jimp
        await jimp.read(url, async (err, image) => {
            if(err){
                console.log("Error when reading image with jimp: " + err);
                reject(err);
            }

            // Nice dimensions
            image.resize(400, 400);
            return image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                if(err){
                    console.log("Error when converting image URL to buffer: " + err);
                    reject(err);
                }
                resolve(buffer);
            });
        });
    });
}

// https://www.youtube.com/watch?v=FKbC83Te1Xw
// Compares 2 images and gets their difference with Pixelmatch
const compareImages = async (url1, url2) => {
    try {
        const img1Buffer = await urlToBuffer(url1);
        const img2Buffer = await urlToBuffer(url2);

        const img1 = PNG.sync.read(img1Buffer);
        const img2 = PNG.sync.read(img2Buffer);
        const { width, height } = img1;
        const diffImg = new PNG({ width, height });

        const diff = pixelmatch(
            img1.data,
            img2.data,
            diffImg.data,
            width, height,
            {
                threshold: 0.1
            }
        );

        // Return compatibility percentage
        const compatibility = 100 - (diff * 100)/(width * height);
        return compatibility;

    } catch(err){
        console.log("Error when comparing images: " + err);
        throw err;
    }
}


// List of country names
// From https://ballsdex.miraheze.org/wiki/Rarity_List, 4/15/2024
// Hudson Bay Company and Polish Underground State were removed (uncatchable)
let countries = [
    "British Empire", "Reichtangle", "Russian Empire", "Scandinavia", "Roman Empire",
    "Qin Dynasty", "German Empire", "Austria-Hungary", "Hunnic Empire", "Japanese Empire",
    "Republic of China", "Soviet Union", "United States", "Vatican", "Russia",
    "China", "India", "Ancient Greece", "Japan", "Korea",
    "Napoleonic France", "Ottoman Empire", "South Korea", "France", "Spanish Empire",
    "Achaemenid Empire", "Macedon", "United Kingdom ", "Pakistan", "Ancient Egypt",
    "Brazil", "Byzantium", "Greenland", "Portuguese Empire", "Qing",
    "British Raj", "Carthage", "Italy", "Kingdom of Italy", "Egypt",
    "Russian SFSR", "Turkey", "Iran", "Kingdom of Greece", "African Union",
    "Arab League", "Confederate States / CSA", "Gaul", "Germania", "Indonesia",
    "Mayan Empire", "Yugoslavia", "Germany", "Australia", "Hong Kong",
    "Israel", "Xiongnu", "Spain", "Antarctica", "Saudi Arabia",
    "Franks", "League of Nations", "Monaco", "Union of South Africa", "Ukraine",
    "Canada", "Poland", "Sweden", "Macau", "Scotland",
    "South Africa", "Greece", "VietNam", "Thailand", "North Korea",
    "England", "European Union", "Francoist Spain", "Manchukuo", "NATO",
    "Republican Spain", "United Arab Republic", "United Nations", "Warsaw Pact", "Weimar Republic",
    "Zhou", "Algeria", "Argentina", "Bangladesh", "Colombia",
    "Czechia", "Iraq", "Malaysia", "Mexico", "Myanmar",
    "Netherlands", "Nigeria", "Norway", "Peru", "Philippines",
    "Portugal", "Prussia", "Romania", "Singapore", "Switzerland",
    "Syria", "Tuvalu", "UAE", "Venezuela", "Ukrainian SSR",
    "Ancient Athens", "Ancient Sparta", "Babylon", "Czechoslovakia", "Ethiopian Empire",
    "French Indochina", "Nauru", "Numidia", "Quebec", "Siam",
    "South Vietnam", "Taiwan", "Wales", "West Germany", "Cuba",
    "Kingdom of Egypt", "Angola", "Austria", "Azerbaijan", "Bahamas",
    "Belarus", "Belgium", "Bolivia", "Bulgaria", "Chile",
    "Croatia", "Cyprus", "Democratic Republic of the Congo / DR Congo", "Denmark", "Ecuador",
    "Ethiopia", "Finland", "Hungary", "Jordan", "Kazakhstan",
    "Kenya", "Kuwait", "Libya", "Morocco", "North Vietnam",
    "Oman", "Qatar", "San Marino", "Serbia", "Slovakia",
    "Sri Lanka", "Sudan", "Tunisia", "Turkmenistan", "Uzbekistan",
    "Yemen", "Faroe Islands", "Trinidad and Tobago", "East Germany", "Free France",
    "Jamaica", "Maldives", "Northern Ireland", "Tibet", "Vichy France",
    "Andorra", "Brunei", "Byelorussian SSR", "Micronesia", "Tonga",
    "Barbados", "Marshall Islands", "Armenia", "Bahrain", "Cambodia",
    "Chad", "Equatorial Guinea", "Free Congo State", "Georgia", "Ghana",
    "Guatemala", "Guyana", "Ireland", "Kyrgyzstan", "Latvia",
    "Lithuania", "Mali", "Malta", "Mongolia", "New Zealand",
    "Samoa", "Slovenia", "Togo", "Uganda", "Uruguay",
    "Zambia", "Zimbabwe", "Malawi", "Costa Rica", "Dominica",
    "Guinea-Bissau", "Sao Tome and Principe", "Tannu Tuva", "Seychelles", "Afghanistan",
    "Albania", "Belize", "Bosnia", "Botswana", "Cameroon",
    "Ceylon", "Congo", "Côte d'Ivoire/Ivory Coast", "Dominican Republic", "Eritrea",
    "Estonia", "Eswatini", "Fiji", "Free City of Danzig", "Gambia",
    "Haiti", "Honduras", "Khiva", "Laos", "Lebanon",
    "Liechtenstein", "Moldova", "Mozambique", "Nepal", "Nicaragua",
    "Niger", "Palestine", "Paraguay", "Saint Kitts and Nevis", "Saint Lucia",
    "Somaliland", "South Sudan", "South Yemen", "Tajikistan", "Tanzania",
    "Western Sahara", "Cape Verde", "Guinea", "Grenada", "Palau",
    "Saint Vincent and The Grenadines", "Solomon Islands", "Vanuatu", "Antigua and Barbuda", "Benin",
    "Bhutan", "Burkina Faso", "Burundi", "Central African Republic / CAR", "Comoros",
    "El Salvador", "Gabon", "Hejaz", "Iceland", "Kiribati",
    "Kosovo", "Lesotho", "Liberia", "Luxembourg", "Madagascar",
    "Mauritania", "Mauritius", "Montenegro", "Namibia", "North Macedonia",
    "Panama", "Papua New Guinea", "Paris Commune", "Rwanda", "Senegal",
    "Sierra Leone", "Somalia", "Suriname", "Timor-Leste", "Djibouti"
];


// https://stackoverflow.com/questions/63322284/discord-js-get-an-array-of-all-messages-in-a-channel
/**
 * Returns an array of spawn data
 * 
 * @param channel - BallsDex spawn channel
 * @param verifiedCaught - Map of {spawn ID, true if verified caught}. Values changed within function. MUST BE PRESENT.
 * @param numCaught - Map of {country name, # oft imes caught}. Values changed within function. MUST BE PRESENT.
 * @return spawns - Array of [spawn message IDs, image URL]
 */
async function getUnverifiedImages(channel, verifiedCaught, numCaught){
    // Array of numeric BallsDex spawn message IDs
    let spawns = [];


    // Create message pointer
    let message = await channel.messages
        .fetch({ limit: 1 })
        .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));


    while (message) {
        await channel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
                
                // Limiting messages to BallsDex spawns
                // 1. Message must be from BallsDex
                // 2. Message must have content "A wild countryball appeared!"
                messagePage.forEach(msg => {
                    if(msg.author.id === process.env.BALLSDEX_USER_ID){
                        if(msg.content.includes("You caught ")){
                            let startInd = msg.content.indexOf("You caught ") + "You caught **".length;
                            let endInd = msg.content.indexOf("!");
                            let country = msg.content.substring(startInd, endInd).toLowerCase();

                            // Catch messages are always a reply to the spawn message.
                            // The spawn message directed to by the parent of the catch message is verified caught.
                            verifiedCaught.set(msg.reference.messageId, true);

                            if(numCaught.has(country)) numCaught[country]++;
                            else numCaught.set(country, 0);

                            console.log(country);
                        }

                        else if(msg.content === "A wild countryball appeared!"){
                            // Get URL of countryball image
                            let imgURL = msg.attachments.first().url;
                            spawns.push([msg.id, imgURL]);

                            console.log(imgURL);
                        }
                    }
                });

                // Update our message pointer to be the last message on the page of messages
                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
    }

    // Return the spawn message IDs
    return spawnMsgIDs;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('getballs')
        .setDescription('Gets data for balls'),

    async execute(interaction) {
        const channel = interaction.client.channels.cache.get(process.env.CHANNEL_ID);
        //interaction.reply("this may take a while, please wait a few minutes...");
        
        // Map of numeric BallsDex spawn message IDs that were verified captured
        // i.e. ones for which we could find catch messages
        // { key: ID of spawn, value: true if verified caught }
        /*let verifiedCaught = new Map();

        // Map of {key: country name, value: number of times it was caught}
        let numCaught = new Map();

        // Array of [spawn message ID, spawn image URL]
        let spawns = await getUnverifiedImages(channel, verifiedCaught, numCaught);

        
        // Determine the countries of unverified spawns
        for(let i = 0; i < spawns.length; i++){
            // We only want unverified spawns
            if(verifiedCaught.has(spawnID)) continue;

            let spawnID = spawns[i][0];
            let spawnImgURL = spawns[i][1];

            console.log("Unverified: " + spawnID + "...");
        }

        // Organize data into readable format
        let dataContents = "";
        for(let [key, val] of numCaught){
            dataContents += key + ": " + val + "\n";
        }

        console.log(dataContents);*/

        let TEST_1 = "https://cdn.discordapp.com/attachments/1215530757192417290/1228494972957757540/nt_PRglZMZtTkzqfFk.png?ex=662c4019&is=6619cb19&hm=85063d5cbdb7e935d104fc3e232585f712331f3e19815c964ac514565b1bd389&";
        let TEST_2 = "https://cdn.discordapp.com/attachments/1215530757192417290/1221217784919494676/nt_OKuiAAMWaPwqciF.png?ex=662d7631&is=661b0131&hm=d375f5d57b52aa45b7122d4fe66fa1c659417cd0dce81fe829dd76a2b38709be&";
        
        let res = await compareImages(TEST_1, TEST_2);
        console.log(res + "% compatible");

        // Write data to file
        /*fs.appendFile('data.txt', dataContents, function(err){
            if(err) throw err;
        });


        // Data as file
        channel.send({
            files: ["data.txt"],
            content: `Here's your data:`
        });*/

        // Todo: make this ping the user who sent the message
        //channel.send("There are " + msgs.length + " BallsDex spawns in this channel.");
        //console.log("There are " + messages.length + " BallsDex spawns in this channel.");
    }
};
