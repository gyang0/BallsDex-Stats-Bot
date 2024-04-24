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


// Environment variables
require('dotenv').config();


// List of country names
// From https://ballsdex.miraheze.org/wiki/Rarity_List, 4/15/2024
// Hudson Bay Company and Polish Underground State are now uncatchable but kept.
/*
    Circumflex over O in Cote d'Ivoire removed
    "Free Congo State" changed to "Congo Free State"
    "Russian SFSR" changed to "Russian Soviet Federative Socialist Republic"
    "Ukrainian SSR" changed to "Ukrainian Soviet Socialist Republic"
    "Bosnia" changed to "Bosnia and Herzegovina"
*/
let countries = [
    "British Empire", "Reichtangle", "Russian Empire", "Kalmar Union", "Roman Empire",
    "Qin Dynasty", "German Empire", "Austria-Hungary", "Hunnic Empire", "Japanese Empire",
    "Republic of China", "Soviet Union", "United States", "Vatican", "Russia",
    "China", "India", "Ancient Greece", "Japan", "Korea",
    "Napoleonic France", "Ottoman Empire", "South Korea", "France", "Spanish Empire",
    "Achaemenid Empire", "Macedon", "United Kingdom", "Pakistan", "Ancient Egypt",
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
    "Syria", "Tuvalu", "UAE", "Venezuela", "Ukrainian Soviet Socialist Republic",
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
    "Cambodia", "Chad", "Equatorial Guinea", "Congo Free State", "Georgia",
    "Ghana", "Guatemala", "Guyana", "Hudson Bay Company", "Ireland",
    "Kyrgyzstan", "Latvia", "Lithuania", "Mali", "Malta",
    "Mongolia", "New Zealand", "Samoa", "Slovenia", "Togo",
    "Uganda", "Uruguay", "Zambia", "Zimbabwe", "Malawi",
    "Costa Rica", "Dominica", "Guinea-Bissau", "Sao Tome and Principe", "Tannu Tuva",
    "Seychelles", "Afghanistan", "Albania", "Belize", "Bosnia and Herzegovina",
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
    "Timor-Leste", "Djibouti",


    // New balls (no spawnart associated yet)
    "Ming Dynasty", "Majapahit", "Mali Empire", "Second French Empire", "Swedish Empire",
    "Khedivate of Egypt", "Principality of Moldavia", "Yuan Dynasty", "Republic of Venice",
    "Safavid Empire", "Kingdom of Sardinia", "Grand Duchy of Tuscany", "Mughal Empire",
    "Parthian Empire", "Liberian Union", "Fatimid Caliphate", "Austrian Empire", "Kingdom of Brandenburg",
    "Holy Roman Empire", "Nanda Empire", "Polish-Lithuanian Commonwealth", "Golden Horde",
    "Khmer Empire", "Kingdom of Hungary", "Qajar Dynasty", "Mongol Empire"
];

/**
 * Certain country names may have changed in BallsDex updates
 * Those should still be unified under a single name to avoid bugs.
 */
function correctCountryName(str){
    str = str.toLowerCase();
    
    if(str === "bosnia") return "bosnia and herzegovina";

    return str;
}


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
        .greyscale()
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


/**
 * Returns an array of spawn data
 * https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages?rq=4
 * https://stackoverflow.com/questions/63322284/discord-js-get-an-array-of-all-messages-in-a-channel
 * 
 * @param channel - BallsDex spawn channel
 * @param verifiedCaught - Map of {spawn ID, true if verified caught}. Values changed within function. MUST BE PRESENT.
 * @param numCaught - Map of {country name, # oft imes caught}. Values changed within function. MUST BE PRESENT.
 * @return spawns - Array of [spawn message IDs, image URL]
 */
async function getSpawns(channel, verifiedCaught, numCaught){
    let spawns = [];
    let last_id;


    // Pagination to get all messages
    while (true) {
        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        // Get messages in the channel
        const messages = await channel.messages.fetch(options);

        // Push messages from BallsDex into an array
        messages.forEach(msg => {
            if(msg.author.id === process.env.BALLSDEX_USER_ID){
                
                // Spawns & catch messages
                if(msg.content.includes("You caught **")){
                    let startInd = msg.content.indexOf("You caught **") + "You caught **".length;
                    let endInd = msg.content.indexOf('!');
                    let country = msg.content.substring(startInd, endInd).toLowerCase();

                    // Sometimes names of countries change, but we want to avoid that.
                    country = correctCountryName(country);

                    // Catch messages are always a reply to the spawn message.
                    // The spawn message directed to by the parent of the catch message is verified caught.
                    verifiedCaught.set(msg.reference.messageId, true);

                    if(!numCaught.has(country)){
                        console.error("ERROR! The following country name does not exist in my database: " + country);
                    }

                    numCaught.set(country, numCaught.get(country) + 1);

                } else if(msg.content === "A wild countryball appeared!"){
                    // Get URL of countryball image
                    let imgURL = msg.attachments.first().url;
                    spawns.push([msg.id, imgURL]);

                    // It's nice to keep track of progress
                    if(spawns.length % 100 === 0){
                        console.log(spawns.length + " spawns counted.");
                    }
                }
            }
        });

        last_id = messages.last().id;

        if (messages.size != 100) {
            break;
        }
    }

    return spawns;
}

/**
 * Make a guess on what countryball an image has
 * @param imgURL - The URL of the image in question
 * @param repoContent - Contents of the spawnart GitHub repo (through the API)
 */
async function getBestGuess(imgURL, repoContent){
    /*let bestGuess = {
        country: "",
        score: -1.00
    };*/

    // These surface level files in repoContent.data are all the spawn images.
    for(let i = 0; i < repoContent.data.length; i++){

        // Ignore anything that isn't an image or gif
        if(/^.*\.(png|gif)$/.test(repoContent.data[i].name) === false){
            continue;
        }

        // Get similarity score between the 2 images
        let curScore = await compareImages(imgURL, repoContent.data[i].download_url);

        // Short-circuit: more than 95% matching image found
        if(curScore >= 95){
            let country = repoContent.data[i].name.substr(
                1,
                repoContent.data[i].name.indexOf(']') - 1
            );

            return {
                country: country,
                score: curScore
            };
        }
    }

    return { country: "", score: -1.00 };
}


let IS_RUNNING = false;


module.exports = {
    data: new SlashCommandBuilder()
        .setName('getballs')
        .setDescription('Gets data for balls'),

    async execute(interaction) {
        if(IS_RUNNING){
            interaction.reply("Already running elsewhere. Try again after that finishes.");
            return;
        }

        IS_RUNNING = true;

        const channel = interaction.client.channels.cache.get(process.env.CHANNEL_ID);
        //interaction.reply("This is probably going to take really long. Go do something else and I'll ping you when I'm done.");


        // Reminder for me
        console.log("\nHey, make sure you set the channel and guild ID in .env\n");
        

        // Map of numeric BallsDex spawn message IDs that were verified captured
        // i.e. ones for which we could find catch messages
        // { key: ID of spawn, value: true if verified caught }
        let verifiedCaught = new Map();

        // Map of {key: country name, value: number of times it was caught}
        // WARNING: when using this, the key should be lowercase.
        // e.g. numCaught.get("Reichtangle") doesn't work, but numCaught.get("reichtangle") does.
        let numCaught = new Map();
        for(let i = 0; i < countries.length; i++){
            numCaught.set(countries[i].toLowerCase(), 0);
        }

        // Array of [spawn message ID, spawn image URL]
        let spawns = await getSpawns(channel, verifiedCaught, numCaught);

        console.log("------------------------TEST------------------");
        for(let i = 0; i < 10; i++){
            console.log(countries[i] + ": " + numCaught.get(countries[i].toLowerCase()));
        }
        console.log("------------------------END TEST------------------");

        
        // Determine the countries of unverified spawns
        let unverified = [];

        for(let i = 0; i < spawns.length; i++){
            let spawnID = spawns[i][0];
            let spawnImgURL = spawns[i][1];

            // We only want unverified spawns
            if(verifiedCaught.has(spawnID) && verifiedCaught.get(spawnID) === true){
                continue;
            }

            unverified.push(spawnImgURL);
        }


        // Now we attempt to automatically identify unverified spawns

        // URLs of images that are still unverified (less than 95% match)
        let stillUnverified = [];

        // Connect to GitHub API
        const octokit = new Octokit({});
        const repoContent = await octokit.rest.repos.getContent({
            owner: "gyang0",
            repo: "BallsDex-Spawnarts"
        });

        // Clear the GitHub image buffer cache just in case
        ghBufferCache.clear();

        console.log("Now analyzing " + unverified.length + " unverified spawns...");
        for(let i = 0; i < unverified.length; i++){
            let guess = await getBestGuess(unverified[i], repoContent);

            if(guess.score < 95.00){
                stillUnverified.push(unverified[i]);

            } else {
                numCaught.set(guess.country, numCaught.get(guess.country) + 1);
            }

            console.log((i + 1) + "/" + unverified.length + " done.");
            //console.log(unverified[i] + "\nIdentified as " + guess.country + ", " + guess.score + "%.\n");
            console.log(guess.country + " set to " + numCaught.get(guess.country) + "\n");
        }
        console.log("Finished. " + (unverified.length - stillUnverified.length) + " balls automatically identified.");


        // Organize data into readable format
        let dataContents = "There were a total of " + spawns.length + " ball spawns in this channel.\n";
        dataContents += "Of these, " + (spawns.length - unverified.length) + " balls were caught.\n";
        dataContents += (unverified.length + " balls remained uncaught.\n");
        dataContents += "\t- Of these, " + (unverified.length - stillUnverified.length) + " balls were identified automatically (95% certainty or more).\n";
        dataContents += "\t- There are " + (stillUnverified.length) + " balls that require manual identification.\n\n";
        
        dataContents += ">>>>>>>>>> Unverified spawn images (FACTOR THESE INTO THE TOTAL)\n";
        dataContents += ">>>>>>>>>> For your own sanity, use https://www.openallurls.com/ to open these links.\n";
        if(stillUnverified.length === 0){
            dataContents += "No unclear images, yay!\n";
        }
        for(let i = 0; i < stillUnverified.length; i++){
            dataContents += stillUnverified[i] + "\n";
        }

        dataContents += "\n";
        dataContents += ">>>>>>>>>> Data for verified spawns:\n";
        for(let i = 0; i < countries.length; i++){
            dataContents += (countries[i] + ": " + numCaught.get(countries[i].toLowerCase()) + "\n");
        }


        // Write data to file
        fs.writeFile('data.txt', dataContents, function(err){
            if(err) throw err;
        });
        channel.send({
            files: ["data.txt"],
            content: `<@${interaction.member.user.id}> Your data:`
        });


        IS_RUNNING = false;

        // TODO (for bugfixing)
        // https://github.com/lovell/sharp/issues/1901
        // Test with Ireland
        // Test # of captures and # of spawns - is it really a cache problem?

        // 1. # of spawns & captures should work correctly.
        // 2. Are images being recognized properly?
        /*
        Total 2468 spawns counted.
        Now analyzing 512 unverified spawns

        ???
        */
    }
};
