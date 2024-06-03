const { Client, GatewayIntentBits } = require('discord.js');
const play = require('play-dl');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const [command, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/);

    if (command === 'play') {
        if (args.length === 0) return message.reply('Please provide a YouTube URL');

        const url = args[0];

        const isValid = await play.validate(url);
        if (!isValid) return message.reply('Please provide a valid YouTube URL');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be in a voice channel to play music');

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('The bot has connected to the channel!');
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('The bot has disconnected from the channel!');
        });

        const player = createAudioPlayer();

        player.on('error', error => {
            console.error('Error:', error.message);
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('The bot is playing audio!');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('The bot has stopped playing audio.');
            connection.destroy();
        });

        try {
            const stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });

            player.play(resource);
            connection.subscribe(player);

            message.reply(`Now playing: ${url}`);
        } catch (error) {
            console.error('Error during playback:', error);
            message.reply('There was an error trying to play the audio.');
        }
    }
});

client.login('');