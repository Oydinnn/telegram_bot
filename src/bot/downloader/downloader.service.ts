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
    const cookiesPath = path.join(process.cwd(), 'instagram_cookies.txt');
    const command = `yt-dlp -v -f "best[ext=mp4]" --cookies "${cookiesPath}" --downloader aria2c --downloader-args "aria2c:-x 16 -s 16 -k 1M" -o "${outputPath}" "${url}"`;

    return this.runWithRetry(command, outputPath);
  }

  async downloadInstagramAudio(url: string): Promise<string> {
    const fileId = uuid();
    const outputPath = path.join(this.tempDir, `${fileId}.mp3`);
    const cookiesPath = path.join(process.cwd(), 'instagram_cookies.txt');
    const command = `yt-dlp -v -x --audio-format mp3 --audio-quality 0 --cookies "${cookiesPath}" -o "${outputPath}" "${url}"`;

    return this.runWithRetry(command, outputPath);
  }

  private async runWithRetry(command: string, outputPath: string): Promise<string> {
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const delayMs = 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        this.logger.log(`Buyruq (urinish ${attempt}/${maxAttempts}): ${command}`);
        const t0 = Date.now();

        await execAsync(command, { timeout: 300000 });

        const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
        this.logger.log(`yt-dlp jami vaqti: ${totalTime}s`);

        if (!fs.existsSync(outputPath)) {
          throw new Error('Fayl yuklab bo\'lmadi');
        }

        return outputPath;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Urinish ${attempt} muvaffaqiyatsiz: ${error.message}`);

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    throw lastError;
  }

  async getVideoDescription(url: string): Promise<string | null> {
    try {
      const cookiesPath = path.join(process.cwd(), 'instagram_cookies.txt');
      const command = `yt-dlp --skip-download --cookies "${cookiesPath}" --print "%(description)s" "${url}"`;

      const { stdout } = await execAsync(command, { timeout: 30000 });
      const description = stdout.trim();

      return description.length > 0 ? description : null;
    } catch (error) {
      this.logger.warn(`Tavsifni olishda xato: ${error.message}`);
      return null;
    }
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
