import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BotUpdate } from './downloader/bot.update';
import { DownloaderService } from './downloader/downloader.service';
import { VideoQueueModule } from './queue/video-queue.module';

@Module({
  imports: [PrismaModule, VideoQueueModule],
  providers: [BotUpdate, DownloaderService],
})
export class BotModule {}
