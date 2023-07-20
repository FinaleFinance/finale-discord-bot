const { Client, GatewayIntentBits } = require('discord.js');
const { ethers } = require('ethers');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider('https://testnet.era.zksync.dev');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = '0xadCae7cFec991Bd864055043439a103cbeF152f0';

const lastCommandUse = {};

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guild = client.guilds.cache.get('1124815628231004230');
    
    const existingCommands = await guild.commands.fetch();
    const existingCommand = existingCommands.find((command) => command.name === 'faucet');
    if (existingCommand) {
        console.log('Command already exists.');
        return;
    }

    const commands = [{
        name: 'faucet',
        description: 'Sends a token to a specified Ethereum address',
        options: [{
            name: 'address',
            type: 3,  // 'STRING' type is represented by 3
            description: 'The Ethereum address',
            required: true,
        }],
    }];
    // client.application.commands.set([]);
    // // This updates immediately
    // guild.commands.set([]);
    await guild.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    try {
    if (!interaction.isCommand()) return;

    const { commandName, channel, guild } = interaction;
    
    if (commandName === 'faucet' && channel.id === '1130840862432186459') {
        const user = interaction.user;
        const now = Date.now();

        if (lastCommandUse[user.id] && now - lastCommandUse[user.id] < 24 * 60 * 60 * 1000) {
            await interaction.reply({ content: 'You can only use this command once every 24 hours.', ephemeral: true });
            return;
        }

        const addressOption = interaction.options.get('address');
        if (!addressOption) {
          await interaction.reply({ content: 'Please provide a valid address.', ephemeral: true });
          return;
        }
        
        const ethAddress = addressOption.value;
        try {
            ethers.utils.getAddress(ethAddress);
        } catch {
            await interaction.reply({ content: 'The provided Ethereum address is not valid.', ephemeral: true });
            return;
        }
        lastCommandUse[user.id] = now;

        await interaction.reply({ content:'Processing your request...', ephemeral: true });

        const contract = new ethers.Contract(contractAddress, ['function transfer(address to, uint256 value) public'], wallet);
        const tx = await contract.transfer(ethAddress, ethers.utils.parseUnits('0.5', 18));

        await interaction.followUp({ content: `${user}, your token has been sent! Transaction hash: https://goerli.explorer.zksync.io/tx/${tx.hash}`, ephemeral: true });

        const roleName = "Pathfinder";
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            console.error(`Role not found: ${roleName}`);
            return;
        }

        const member = guild.members.cache.get(user.id);
        if (!member) {
            console.error(`Member not found: ${user.id}`);
            return;
        }

        await member.roles.add(role);
    } else {
        await interaction.reply({ content: `Please run the command on the https://discord.com/channels/1124815628231004230/1130840862432186459 channel`, ephemeral: true });
    }
} catch (error) {

}
});

client.login(process.env.DISCORD_TOKEN);
