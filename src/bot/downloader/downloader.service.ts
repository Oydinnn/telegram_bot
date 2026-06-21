import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class DownloaderService {
  private readonly logger = new Logger(DownloaderService.name);
  private tempDir = path.join(__dirname, '..', '..', 'temp');

  constructor() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async downloadInstagramVideo(url: string): Promise<string> {
  const fileId = uuid();
  const outputPath = path.join(this.tempDir, `${fileId}.mp4`);

 

  const command = `yt-dlp -v -f "best[ext=mp4]" --downloader aria2c --downloader-args "aria2c:-x 16 -s 16 -k 1M" -o "${outputPath}" "${url}"`; 

  this.logger.log(`Buyruq: ${command}`);
  const t0 = Date.now();

  const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  this.logger.log(`yt-dlp jami vaqti: ${totalTime}s`);

  if (!fs.existsSync(outputPath)) {
    throw new Error('Video yuklab bo\'lmadi');
  }

  return outputPath;
}

  getFileSizeMB(filePath: string): string {
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    return sizeMB.toFixed(1);
  }

  async getVideoDuration(filePath: string): Promise<string> {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout } = await execAsync(command);
      const totalSeconds = Math.round(parseFloat(stdout.trim()));

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return 'noma\'lum';
    }
  }

  cleanup(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}