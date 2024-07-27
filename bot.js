const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ]
});

let ticketChannel;

client.on('ready', () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
});
// 
client.on('messageCreate', async message => {
    if (message.content === '.buton') {
        
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return; 
        }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Ticket')
      .setDescription('Ticket için butona tıkla.');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticketButton')
          .setLabel('Aç')
          .setStyle(ButtonStyle.Primary)
      );

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
      console.log('Embed ve buton gönderildi');
    } catch (error) {
      console.error('Mesaj gönderilirken bir hata oluştu:', error);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'ticketButton') {
    const ticketChannelName = `ticket-${interaction.user.username}`;
    const ticketCategory = interaction.guild.channels.cache.get(config.ticketCategoryId);

    if (!ticketCategory) {
      return interaction.reply({ content: 'Ticket kategorisi bulunamadı!', ephemeral: true });
    }

    if (ticketCategory.children.cache.find(c => c.name === ticketChannelName)) {
      return interaction.reply({ content: 'Zaten açık bir ticketınız var!', ephemeral: true });
    }

    try {
      ticketChannel = await interaction.guild.channels.create({ 
        name: ticketChannelName,
        type: 0, 
        parent: ticketCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          {
            id: config.ticketSupportRoleId, 
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
        ],
      });

      
      const menuEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Ticket Menü')
        .setDescription('Sorunun çözüldü mü?');

      const menuRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('callSupport')
            .setLabel('Yetkili Çağır')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('closeTicket')
            .setLabel('Ticket Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ embeds: [menuEmbed], components: [menuRow] });
      await interaction.reply({ content: `Ticket oluşturuldu: ${ticketChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Ticket oluşturulurken bir hata oluştu:', error);
      await interaction.reply({ content: 'Ticket oluşturulamadı. Lütfen daha sonra tekrar deneyin.', ephemeral: true });
    }
  } else if (interaction.customId === 'callSupport') {
    const supportRole = interaction.guild.roles.cache.get(config.ticketSupportRoleId);
    if (supportRole) {
      await ticketChannel.send(`${supportRole}`); 
      await interaction.reply({ content: 'Yetkili çağrıldı!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Yetkili rolü bulunamadı!', ephemeral: true });
    }
  } else if (interaction.customId === 'closeTicket') {
    const confirmEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Ticket Kapatma')
      .setDescription('Emin misin?');

    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirmClose')
          .setLabel('Kapat')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.update({ embeds: [confirmEmbed], components: [confirmRow] });
  } else if (interaction.customId === 'cancelClose') {
    
    await interaction.update({ content: 'Ticket kapatma işlemi iptal edildi.', embeds: [], components: [] });
  } else if (interaction.customId === 'confirmClose') {
    const ticketOpener = interaction.channel.name.split('-')[1];
    const newChannelName = `kapatılan-ticket-${ticketOpener}`;

    
    await ticketChannel.edit({ 
      name: newChannelName,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: config.ticketSupportRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    await interaction.update({ content: 'Ticket kapatıldı.', embeds: [], components: [] });
  }
});

client.login(config.token);
