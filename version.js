const packageJSON = require("./package.json");

client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    if (message.content == "!stats") {
        const discordJSVersion = packageJSON.dependencies["discord.js"];
        const embed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setTitle(`Bot stats - ${client.user.tag}`)
            .addField("Discord.js version", discordJSVersion);
        message.channel.send({
            embeds: [embed]
        });
    }

});