import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoQueueService } from './video-queue.service';
import { VideoQueueProcessor } from './video-queue.processor';
import { DownloaderService } from '../downloader/downloader.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-download',
    }),
    PrismaModule,
  ],
  providers: [VideoQueueService, VideoQueueProcessor, DownloaderService],
  exports: [VideoQueueService],
})
export class VideoQueueModule {}
