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
const queue = new Map(); // This will store the music queue for each guild

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const [command, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/);
    const serverQueue = queue.get(message.guild.id);

    if (command === 'play') {
        if (args.length === 0) return message.reply('Please provide a YouTube URL');

        let url = args[0];
        
        const isValid = await play.validate(url);
        if (!isValid) return message.reply('Please provide a valid YouTube URL');

        const songInfo = await play.search(url, { limit: 1 });
        if (songInfo.length === 0) return message.reply('No results found for the provided URL or search term');

        const song = {
            title: songInfo[0].title,
            url: songInfo[0].url,
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: message.member.voice.channel,
                connection: null,
                songs: [],
                player: createAudioPlayer(),
                playing: true,
            };

            queue.set(message.guild.id, queueContruct);

            queueContruct.songs.push(song);

            try {
                const connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                queueContruct.connection = connection;
                connection.subscribe(queueContruct.player);

                playSong(message.guild, queueContruct.songs[0]);

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    queue.delete(message.guild.id);
                });

            } catch (err) {
                console.error(err);
                queue.delete(message.guild.id);
                return message.channel.send(err.message);
            }
        } else {
            serverQueue.songs.push(song);
            return message.channel.send(`${song.title} has been added to the queue!`);
        }
    } else if (command === 'skip') {
        skipSong(message, serverQueue);
    } else if (command === 'stop') {
        stopSong(message, serverQueue);
    } else if (command === 'queue') {
        showQueue(message, serverQueue);
    }
});

async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });

    serverQueue.player.play(resource);
    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    });

    serverQueue.player.on('error', error => console.error(error));
    serverQueue.textChannel.send(`Now playing: **${song.title}**`);
}

function skipSong(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply('You have to be in a voice channel to stop the music!');
    if (!serverQueue)
        return message.reply('There is no song that I could skip!');
    serverQueue.player.stop();
}

function stopSong(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply('You have to be in a voice channel to stop the music!');
    serverQueue.songs = [];
    serverQueue.player.stop();
}

function showQueue(message, serverQueue) {
    if (!serverQueue) return message.reply('There is no queue.');
    const queueString = serverQueue.songs.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    message.channel.send(`**Queue:**\n${queueString}`);
}

client.login('');