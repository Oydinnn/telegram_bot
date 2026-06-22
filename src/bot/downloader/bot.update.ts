import { Update, Ctx, On, Start, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { PrismaService } from 'src/prisma/prisma.service';
import { VideoQueueService } from '../queue/video-queue.service';



@Update()
export class BotUpdate {
  // chatId -> kutilayotgan link (sifat tanlanguncha)

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoQueue: VideoQueueService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.saveUser(ctx);
    await ctx.replyWithHTML(this.welcomeText(), this.mainMenuKeyboard());
  }

  @Action('how_to_use')
  async onHowToUse(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const text =
      `📖 <b>Qanday ishlatish kerak?</b>\n\n` +
      `1️⃣ Instagram ilovasida kerakli Reel yoki postni oching\n` +
      `2️⃣ <b>Ulashish</b> (Share) tugmasini bosing\n` +
      `3️⃣ <b>Havolani nusxalash</b> (Copy link) ni tanlang\n` +
      `4️⃣ Linkni shu botga yuboring\n` +
      `5️⃣ Bir necha soniyada video tayyor bo'ladi! 🎉`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...this.backKeyboard(),
    });
  }

  @Action('show_stats')
  async onShowStats(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const userCount = await this.prisma.user.count();
    const videoCount = await this.prisma.cachedVideo.count();

    const text =
      `📊 <b>Bot statistikasi</b>\n\n` +
      `👥 Foydalanuvchilar: <b>${userCount}</b>\n` +
      `🎬 Keshdagi videolar: <b>${videoCount}</b>`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...this.backKeyboard(),
    });
  }

  @Action('delete_video')
  async onDeleteVideo(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
  }

  @Action(/^show_description:(\d+)$/)
  async onShowDescription(@Ctx() ctx: Context) {
    const match = (ctx as any).match;
    const videoId = parseInt(match[1], 10);

    const cachedVideo = await this.prisma.cachedVideo.findUnique({
      where: { id: videoId },
    });

    if (!cachedVideo || !cachedVideo.description) {
      await ctx.answerCbQuery('Tavsif topilmadi 😔', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    const description = cachedVideo.description.length > 900
      ? cachedVideo.description.slice(0, 900) + '...'
      : cachedVideo.description;

    await ctx.reply(`📝 <b>Post tavsifi:</b>\n\n${description}`, {
      parse_mode: 'HTML',
    });
  }

  @Action(/^download_audio:(\d+)$/)
  async onDownloadAudio(@Ctx() ctx: Context) {
    const match = (ctx as any).match;
    const videoId = parseInt(match[1], 10);

    const cachedVideo = await this.prisma.cachedVideo.findUnique({
      where: { id: videoId },
    });

    if (!cachedVideo) {
      await ctx.answerCbQuery('Video topilmadi 😔', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery('🎵 MP3 ajratilmoqda...');

    const loadingMsg = await ctx.reply('⏳ MP3 ajratilmoqda...');

    await this.videoQueue.addAudioJob({
      url: cachedVideo.instagramUrl,
      normalizedUrl: cachedVideo.instagramUrl,
      chatId: ctx.chat!.id,
      loadingMessageId: loadingMsg.message_id,
    });
  }

  @Action('back_to_start')
  async onBackToStart(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(this.welcomeText(), {
      parse_mode: 'HTML',
      ...this.mainMenuKeyboard(),
    });
  }


  @On('text')
  async onText(@Ctx() ctx: Context) {
    await this.saveUser(ctx);

    const message = ctx.message as any;
    const text = message.text;

    if (!this.isInstagramLink(text)) {
      return ctx.reply('Iltimos, to\'g\'ri Instagram link yuboring.');
    }

    const normalizedUrl = this.normalizeUrl(text);
    const startTime = Date.now();

    const cached = await this.prisma.cachedVideo.findUnique({
      where: { instagramUrl: normalizedUrl },
    });

    if (cached) {
      const userCount = await this.prisma.user.count();
      await ctx.replyWithVideo(cached.telegramFileId, {
        caption: `✅ Video tayyor!`,
        // caption: `✅ Video tayyor! (keshdan, ${((Date.now() - startTime) / 1000).toFixed(1)}s)\n\n👥 Bot foydalanuvchilari: ${userCount}`,

        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑 O\'chirish', callback_data: 'delete_video' },
              { text: '📝 Tavsif', callback_data: `show_description:${cached.id}` },
            ],
            [
              { text: '🎵 MP3', callback_data: `download_audio:${cached.id}` },
            ],
          ],
        },
      });
      return;
    }

    const loadingMsg = await ctx.reply('⏳ Video yuklanmoqda ...');

    await this.videoQueue.addVideoJob({
      url: text,
      normalizedUrl,
      chatId: ctx.chat!.id,
      loadingMessageId: loadingMsg.message_id,
    });
  }

  private welcomeText(): string {
    return (
      `👋 <b>Assalomu alaykum!</b>\n\n` +
      `🎬 Men Instagram'dan video yuklab beruvchi botman.\n\n` +
      `📥 Menga Instagram Reel yoki post linkini yuboring — men sizga videoni tez orada jo'natib beraman.\n\n` +
      `⚡️ Tez, oson va bepul!`
    );
  }

  private mainMenuKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📖 Qanday ishlatish', 'how_to_use')],
      [Markup.button.callback('📊 Statistika', 'show_stats')],
    ]);
  }

  private backKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Orqaga', 'back_to_start')],
    ]);
  }

  private normalizeUrl(url: string): string {
    return url.split('?')[0].trim();
  }

  private async saveUser(ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    await this.prisma.user.upsert({
      where: { telegramId: from.id.toString() },
      update: {},
      create: {
        telegramId: from.id.toString(),
        username: from.username,
        firstName: from.first_name,
      },
    });
  }

  private isInstagramLink(text: string): boolean {
    return /instagram\.com\/(p|reel|reels|tv)\//.test(text);
  }
}
