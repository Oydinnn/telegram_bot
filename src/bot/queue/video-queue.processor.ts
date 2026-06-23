import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { DownloaderService } from '../downloader/downloader.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VideoJobData } from './video-queue.service';

@Processor('video-download', { concurrency: 5 })
export class VideoQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoQueueProcessor.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly downloader: DownloaderService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<VideoJobData>): Promise<void> {
    if (job.data.type === 'audio') {
      return this.processAudio(job);
    }
    return this.processVideo(job);
  }

  private async processVideo(job: Job<VideoJobData>): Promise<void> {
    const { url, normalizedUrl, chatId, loadingMessageId } = job.data;
    const downloadStart = Date.now();

    try {
      const [filePath, description] = await Promise.all([
        this.downloader.downloadInstagramVideo(url),
        this.downloader.getVideoDescription(url),
      ]);
      const downloadTime = ((Date.now() - downloadStart) / 1000).toFixed(1);
      const fileSizeMB = this.downloader.getFileSizeMB(filePath);
      const duration = await this.downloader.getVideoDuration(filePath);
      const userCount = await this.prisma.user.count();

      const cachedVideo = await this.prisma.cachedVideo.upsert({
        where: { instagramUrl: normalizedUrl },
        update: { description },
        create: {
          instagramUrl: normalizedUrl,
          telegramFileId: '',
          description,
        },
      });

      const thumbPath = await this.downloader.downloadThumbnail(url);

      const uploadStart = Date.now();
      const sentMsg = await this.bot.telegram.sendVideo(
        chatId,
        { source: filePath },
        {
          thumbnail: thumbPath ? { source: thumbPath } : undefined,
          caption: `✅ Video tayyor!`,
          // caption: `✅ Video tayyor!\n📦 Hajmi: ${fileSizeMB} MB\n⏱ Davomiyligi: ${duration}\n⬇️ Yuklash: ${downloadTime}s\n👥 Bot foydalanuvchilari: ${userCount}`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📝 Tavsif', callback_data: `show_description:${cachedVideo.id}` },
                { text: '🎵 MP3', callback_data: `download_audio:${cachedVideo.id}` },
              ],
              [
                { text: '🗑 O\'chirish', callback_data: 'delete_video' },

              ],
            ],
          },
        },
      );


      
      const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(1);
      this.logger.log(`Yuklash: ${downloadTime}s, Yuborish: ${uploadTime}s`);

      const video = sentMsg.video as any;
      if (video?.file_id) {
        await this.prisma.cachedVideo.update({
          where: { id: cachedVideo.id },
          data: { telegramFileId: video.file_id },
        });
      }

      this.downloader.cleanup(filePath);
      if (thumbPath) this.downloader.cleanup(thumbPath);
      await this.bot.telegram.deleteMessage(chatId, loadingMessageId);
    } catch (error) {
      this.logger.error(error);
      const message = error instanceof Error ? error.message : '';

      await this.bot.telegram
        .deleteMessage(chatId, loadingMessageId)
        .catch(() => {});

      if (message.toLowerCase().includes('no video formats')) {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ Bu post video emas, rasm ekan. Video (Reel) link yuboring.',
        );
      } else {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ Videoni yuklab bo\'lmadi. Linkni tekshirib qaytadan urinib ko\'ring.',
        );
      }
    }
  }

  private async processAudio(job: Job<VideoJobData>): Promise<void> {
    const { url, chatId, loadingMessageId } = job.data;
    const downloadStart = Date.now();

    try {
      const filePath = await this.downloader.downloadInstagramAudio(url);
      const downloadTime = ((Date.now() - downloadStart) / 1000).toFixed(1);
      const fileSizeMB = this.downloader.getFileSizeMB(filePath);

      const sentAudio = await this.bot.telegram.sendAudio(
        chatId,
        { source: filePath },
        {
          caption: `🎵 MP3 tayyor!`,
        },
      );

      const audio = sentAudio.audio as any;
      if (audio?.file_id && job.data.videoId) {
        await this.prisma.cachedVideo.update({
          where: { id: job.data.videoId },
          data: { audioFileId: audio.file_id },
        });
      }

      this.downloader.cleanup(filePath);
      await this.bot.telegram.deleteMessage(chatId, loadingMessageId).catch(() => {});
    } catch (error) {
      this.logger.error(error);

      await this.bot.telegram
        .deleteMessage(chatId, loadingMessageId)
        .catch(() => {});

      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.toLowerCase().includes('audio codec')) {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ Bu reelda audio mavjud emas.',
        );
      } else {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ MP3 ajratib bo\'lmadi. Qaytadan urinib ko\'ring.',
        );
      }
    }
  }
}
