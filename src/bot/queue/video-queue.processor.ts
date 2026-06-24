import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { DownloaderService } from '../downloader/downloader.service';
import { UserProcessingService } from '../downloader/user-processing.service';
import { HikerApiService } from '../downloader/hikerapi.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VideoJobData } from './video-queue.service';

@Processor('video-download', { concurrency: 5 })
export class VideoQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoQueueProcessor.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly downloader: DownloaderService,
    private readonly hikerApi: HikerApiService,
    private readonly prisma: PrismaService,
    private readonly userProcessing: UserProcessingService,
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
      const mediaInfo = await this.hikerApi.getMediaInfo(url);
      const fetchTime = ((Date.now() - downloadStart) / 1000).toFixed(1);
      this.logger.log(`HikerAPI javob vaqti: ${fetchTime}s`);

      const cachedVideo = await this.prisma.cachedVideo.upsert({
        where: { instagramUrl: normalizedUrl },
        update: { description: mediaInfo.caption },
        create: {
          instagramUrl: normalizedUrl,
          telegramFileId: '',
          description: mediaInfo.caption,
        },
      });

      const uploadStart = Date.now();
      const sentMsg = await this.bot.telegram.sendVideo(
        chatId,
        { url: mediaInfo.videoUrl },
        {
          thumbnail: mediaInfo.thumbnailUrl ? { url: mediaInfo.thumbnailUrl } : undefined,
          caption: `✅ Video tayyor!`,
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
      this.logger.log(`HikerAPI: ${fetchTime}s, Telegram yuborish: ${uploadTime}s`);

      const video = sentMsg.video as any;
      if (video?.file_id) {
        await this.prisma.cachedVideo.update({
          where: { id: cachedVideo.id },
          data: { telegramFileId: video.file_id },
        });
      }

      await this.bot.telegram.deleteMessage(chatId, loadingMessageId);
    } catch (error) {
      this.logger.error(error);
      const message = error instanceof Error ? error.message : '';

      await this.bot.telegram
        .deleteMessage(chatId, loadingMessageId)
        .catch(() => {});
      if (message.includes('video emas')) {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ Bu post video emas, rasm ekan. Video (Reel) link yuboring.',
        );
      } else if (message.includes('topilmadi')) {
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ Video topilmadi. Linkni tekshirib qaytadan urinib ko\'ring.',
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
      const mediaInfo = await this.hikerApi.getMediaInfo(url);
      const fetchTime = ((Date.now() - downloadStart) / 1000).toFixed(1);
      this.logger.log(`HikerAPI (audio) javob vaqti: ${fetchTime}s`);

      let sentAudio;
      let localFilePath: string | null = null;

      if (mediaInfo.audioUrl) {
        sentAudio = await this.bot.telegram.sendAudio(
          chatId,
          { url: mediaInfo.audioUrl },
          { caption: `🎵 MP3 tayyor!` },
        );
      } else {
        this.logger.log('HikerAPI audioUrl bermadi, video orqali ajratib olinmoqda...');
        localFilePath = await this.downloader.extractAudioFromVideoUrl(mediaInfo.videoUrl);
        sentAudio = await this.bot.telegram.sendAudio(
          chatId,
          { source: localFilePath },
          { caption: `🎵 MP3 tayyor!` },
        );
      }

      const audio = sentAudio.audio as any;
      if (audio?.file_id && job.data.videoId) {
        await this.prisma.cachedVideo.update({
          where: { id: job.data.videoId },
          data: { audioFileId: audio.file_id },
        });
      }

      if (localFilePath) this.downloader.cleanup(localFilePath);
      await this.bot.telegram.deleteMessage(chatId, loadingMessageId).catch(() => {});
    } catch (error) {
      this.logger.error(error);

      await this.bot.telegram
        .deleteMessage(chatId, loadingMessageId)
        .catch(() => {});

      await this.bot.telegram.sendMessage(
        chatId,
        '❌ MP3 ajratib bo\'lmadi. Qaytadan urinib ko\'ring.',
      );
    }
  }
}
