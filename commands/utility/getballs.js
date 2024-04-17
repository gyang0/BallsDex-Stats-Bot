// Node filestream
const fs = require("fs");

const { SlashCommandBuilder } = require("discord.js");
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

// Image compressions
const axios = require("axios");
const sharp = require("sharp"); // Sharp is fast for resizing images

// To use GitHub API endpoints
const { Octokit } = require("octokit");
const octokit = new Octokit({});


// Environment variables
require('dotenv').config();


// List of country names
// From https://ballsdex.miraheze.org/wiki/Rarity_List, 4/15/2024
// Hudson Bay Company and Polish Underground State were removed (uncatchable)
let countries = [
    "British Empire", "Reichtangle", "Russian Empire", "Kalmar Union", "Roman Empire",
    "Qin Dynasty", "German Empire", "Austria-Hungary", "Hunnic Empire", "Japanese Empire",
    "Republic of China", "Soviet Union", "United States", "Vatican", "Russia",
    "China", "India", "Ancient Greece", "Japan", "Korea",
    "Napoleonic France", "Ottoman Empire", "South Korea", "France", "Spanish Empire",
    "Achaemenid Empire", "Macedon", "United Kingdom ", "Pakistan", "Ancient Egypt",
    "Brazil", "Byzantium", "Greenland", "Portuguese Empire", "Qing",
    "British Raj", "Carthage", "Italy", "Kingdom of Italy", "Egypt",
    "Russian Soviet Federative Socialist Republic", "Turkey", "Iran", "Kingdom of Greece", "African Union",
    "Arab League", "Confederate States", "Gaul", "Germania", "Indonesia",
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
    "Croatia", "Cyprus", "DR Congo", "Denmark", "Ecuador",
    "Ethiopia", "Finland", "Hungary", "Jordan", "Kazakhstan",
    "Kenya", "Kuwait", "Libya", "Morocco", "North Vietnam",
    "Oman", "Qatar", "San Marino", "Serbia", "Slovakia",
    "Sri Lanka", "Sudan", "Tunisia", "Turkmenistan", "Uzbekistan",
    "Yemen", "Faroe Islands", "Trinidad and Tobago", "East Germany", "Free France",
    "Jamaica", "Maldives", "Northern Ireland", "Polish Underground State", "Tibet",
    "Vichy France", "Andorra", "Brunei", "Byelorussian Soviet Socialist Republic", "Micronesia",
    "Tonga", "Barbados", "Marshall Islands", "Armenia", "Bahrain",
    "Cambodia", "Chad", "Equatorial Guinea", "Free Congo State", "Georgia",
    "Ghana", "Guatemala", "Guyana", "Hudson Bay Company", "Ireland",
    "Kyrgyzstan", "Latvia", "Lithuania", "Mali", "Malta",
    "Mongolia", "New Zealand", "Samoa", "Slovenia", "Togo",
    "Uganda", "Uruguay", "Zambia", "Zimbabwe", "Malawi",
    "Costa Rica", "Dominica", "Guinea-Bissau", "Sao Tome and Principe", "Tannu Tuva",
    "Seychelles", "Afghanistan", "Albania", "Belize", "Bosnia",
    "Botswana", "Cameroon", "Ceylon", "Congo", "Cote d'Ivoire",
    "Dominican Republic", "Eritrea", "Estonia", "Eswatini", "Fiji",
    "Free City of Danzig", "Gambia", "Haiti", "Honduras", "Khiva",
    "Laos", "Lebanon", "Liechtenstein", "Moldova", "Mozambique",
    "Nepal", "Nicaragua", "Niger", "Palestine", "Paraguay",
    "Saint Kitts and Nevis", "Saint Lucia", "Somaliland", "South Sudan", "South Yemen",
    "Tajikistan", "Tanzania", "Western Sahara", "Cape Verde", "Guinea",
    "Grenada", "Palau", "St. Vincent and The Grenadines", "Solomon Islands", "Vanuatu",
    "Antigua and Barbuda", "Benin", "Bhutan", "Burkina Faso", "Burundi",
    "Central African Republic", "Comoros", "El Salvador", "Gabon", "Hejaz",
    "Iceland", "Kiribati", "Kosovo", "Lesotho", "Liberia",
    "Luxembourg", "Madagascar", "Mauritania", "Mauritius", "Montenegro",
    "Namibia", "North Macedonia", "Panama", "Papua New Guinea", "Paris Commune",
    "Rwanda", "Senegal", "Sierra Leone", "Somalia", "Suriname",
    "Timor-Leste", "Djibouti"
];


// Caching image buffers to avoid fetching every time
// { key: url, value: image buffer }
let ghBufferCache = new Map();


// https://www.youtube.com/watch?v=FKbC83Te1Xw
// https://github.com/lovell/sharp/issues/1901#issuecomment-538689406
// Converts an image URL to an image buffer with jimp
async function urlToBuffer(myURL){
    // yay, we have a cached buffer
    if(ghBufferCache.has(myURL)){
        return ghBufferCache.get(myURL);
    }

    // No cached result, so we get the image with axios.
    const img = await axios({
        url: myURL,
        responseType: "arraybuffer"
    });

    const imgBuffer = Buffer.from(img.data, 'utf-8');

    const res = await sharp(imgBuffer)
        .resize(400, 400)
        .png()
        .toBuffer();

    // Cache the result
    ghBufferCache.set(myURL, res);

    return res;
}

// https://www.youtube.com/watch?v=FKbC83Te1Xw
// Compares 2 images and gets their difference with Pixelmatch
async function compareImages(url1, url2){
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
    }
}


// https://stackoverflow.com/questions/63322284/discord-js-get-an-array-of-all-messages-in-a-channel
/**
 * Returns an array of spawn data
 * 
 * @param channel - BallsDex spawn channel
 * @param verifiedCaught - Map of {spawn ID, true if verified caught}. Values changed within function. MUST BE PRESENT.
 * @param numCaught - Map of {country name, # oft imes caught}. Values changed within function. MUST BE PRESENT.
 * @return spawns - Array of [spawn message IDs, image URL]
 */
async function getSpawns(channel, verifiedCaught, numCaught){
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

                            if(numCaught.has(country)) numCaught.set(country, numCaught.get(country) + 1);
                            else numCaught.set(country, 1);

                            //console.log(country + ": " + numCaught.get(country));
                        }

                        else if(msg.content === "A wild countryball appeared!"){
                            // Get URL of countryball image
                            let imgURL = msg.attachments.first().url;
                            spawns.push([msg.id, imgURL]);

                            //console.log(imgURL);
                        }
                    }
                });

                // Update our message pointer to be the last message on the page of messages
                message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
    }

    // Return the spawn message IDs
    return spawns;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('getballs')
        .setDescription('Gets data for balls'),

    async execute(interaction) {
        const channel = interaction.client.channels.cache.get(process.env.CHANNEL_ID);
        /*interaction.reply("This may take a while, please wait a few minutes...");
        
        // Map of numeric BallsDex spawn message IDs that were verified captured
        // i.e. ones for which we could find catch messages
        // { key: ID of spawn, value: true if verified caught }
        let verifiedCaught = new Map();

        // Map of {key: country name, value: number of times it was caught}
        let numCaught = new Map();

        // Array of [spawn message ID, spawn image URL]
        let spawns = await getSpawns(channel, verifiedCaught, numCaught);

        
        // Determine the countries of unverified spawns
        let unverified = [];

        for(let i = 0; i < spawns.length; i++){
            let spawnID = spawns[i][0];
            let spawnImgURL = spawns[i][1];

            // We only want unverified spawns
            if(verifiedCaught.has(spawnID)){
                continue;

            } else {
                unverified.push(spawnImgURL);
                //console.log("Unverified: " + spawnID + "...");
            }
        }

        // Organize data into readable format
        let dataContents = "There were a total of " + spawns.length + " ball spawns in this channel.\n";
        dataContents += "Of these, " + (spawns.length - unverified.length) + " balls were caught.\n";
        dataContents += (unverified.length + " balls remained uncaught.\n\n");
        
        dataContents += ">>>>>>>>>> Unverified spawn images (NOT COUNTED BY BOT, FACTOR THESE INTO THE TOTAL)\n";
        dataContents += "For your own sanity, use https://www.openallurls.com/ to open these links.\n";
        for(let i = 0; i < unverified.length; i++){
            dataContents += unverified[i] + "\n";
        }

        dataContents += "\n";
        dataContents += ">>>>>>>>>> Data for verified spawns:\n";
        for(let i = 0; i < countries.length; i++){
            countries[i] = countries[i].toLowerCase();

            if(numCaught.has(countries[i])){
                dataContents += (countries[i] + ": " + numCaught.get(countries[i]) + "\n");
            } else {
                dataContents += countries[i] + ": 0\n";
            }
        }

        // Write data to file
        fs.writeFile('data.txt', dataContents, function(err){
            if(err) throw err;
        });
        channel.send({
            files: ["data.txt"],
            content: `<@${interaction.member.user.id}> Your data:`
        });*/




        // Testing image comparisons
        let imgs = [
            "https://cdn.discordapp.com/attachments/1215530757192417290/1229299583683657799/nt_UUOGStunThpAjQq.png?ex=662f2d74&is=661cb874&hm=356ce1d0aaa26878bc824c188d492cd4384535f0fb0e3cfd76ed9dcc2d4a15b6&",
            "https://cdn.discordapp.com/attachments/1215530757192417290/1226273978537087007/nt_loaKTpbAVojXWls.png?ex=662d6623&is=661af123&hm=ea270e8eebc65c80c0f54df2eaf8f5843c5586fba26c839c4347e6b6ab805816&",
            "https://cdn.discordapp.com/attachments/1215530757192417290/1224817421161070712/nt_IAsRYcnXwmmVRFT.png?ex=6628199d&is=6615a49d&hm=81047489050e1b471ce219ff38fc07693f2f4627e52f4275aa9e3216975dbb1a&",
            "https://cdn.discordapp.com/attachments/1215530757192417290/1223996668941439096/nt_sQGCyJwcgTrwHtB.png?ex=662e57ba&is=661be2ba&hm=4b02427dfcd84b5e8408b573f338c899dffcf3e3fcbfccd2a3e477cbbfadb9fe&",
            "https://cdn.discordapp.com/attachments/1215530757192417290/1222542386446733373/nt_INlBiZiZeImPCFE.png?ex=66290d52&is=66169852&hm=c673baa1ec1be04dfcf3c754adf4d4f0688a989881db4f792660511c8575a0a3&"
        ];

        const repoContent = await octokit.rest.repos.getContent({
            owner: "gyang0",
            repo: "BallsDex-Spawnarts"
        });


        // Clear the GitHub image buffer cache just in case
        ghBufferCache.clear();

        // The tedious process of comparing with every spawnart associated with every country
        for(let i = 0; i < imgs.length; i++){

            let bestGuess = {
                country: "",
                score: 0.00
            };

            // These surface level files in repoContent.data are all the spawn images.
            for(let j = 0; j < repoContent.data.length; j++){

                // Ignore anything that isn't an image
                if(/^.*\.(png)$/.test(repoContent.data[j].name) === false){
                    continue;
                }

                // Get similarity score between the 2 images
                let curScore = await compareImages(imgs[i], repoContent.data[j].download_url);

                // Found a better guess than the previous one
                if(curScore > bestGuess.score){
                    // Image format is "[country]_[version].png", e.g. [albania]_2.png
                    // We just want the country name - the substring inside [].
                    let country = repoContent.data[j].name.substr(
                        1,
                        repoContent.data[j].name.indexOf(']') - 1
                    );

                    bestGuess.country = country;
                    bestGuess.score = curScore;
                }
            }

            console.log("Best guess is " + bestGuess.country + ", " + bestGuess.score + "% sure.");
        }



        //console.log(dataContents);

        // TODO (for bugfixing)
        // If the country name isn't found in any of the folder names, output an error. This will fix most surface level bugs.
        // Start testing image comparisons and its speed before committing to adding everything.
        // 1. Test out on Pixel Cafe with nothing and see how much it recognizes
        // 2. Add 1 image for each country and see how much it recognizes
        // 3. Add more if necessary.
        // 4. Does compressing the images more help with speed? As in 300x300, 250x250, or even 200x200.
        // 6. Cache images
        // https://github.com/lovell/sharp/issues/1901
    }
};
