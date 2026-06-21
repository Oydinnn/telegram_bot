import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface VideoJobData {
  url: string;
  normalizedUrl: string;
  chatId: number;
  loadingMessageId: number;
}

@Injectable()
export class VideoQueueService {
  constructor(
    @InjectQueue('video-download') private readonly videoQueue: Queue<VideoJobData>,
  ) {}

  async addVideoJob(data: VideoJobData) {
    await this.videoQueue.add('download', data, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}
