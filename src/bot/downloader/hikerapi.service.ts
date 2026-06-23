import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HikerApiMediaResult {
  videoUrl: string;
  thumbnailUrl: string | null;
  audioUrl: string | null;
  durationSeconds: number;
  caption: string | null;
  username: string | null;
  width: number;
  height: number;
}

@Injectable()
export class HikerApiService {
  private readonly logger = new Logger(HikerApiService.name);
  private readonly baseUrl = 'https://api.hikerapi.com/v2/media/info/by/url';

  constructor(private readonly configService: ConfigService) {}

  async getMediaInfo(instagramUrl: string): Promise<HikerApiMediaResult> {
    const apiKey = this.configService.get<string>('HIKERAPI_KEY');

    if (!apiKey) {
      throw new Error('HIKERAPI_KEY .env faylida topilmadi');
    }

    const encodedUrl = encodeURIComponent(instagramUrl);
    const requestUrl = `${this.baseUrl}?url=${encodedUrl}`;

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        headers: { 'x-access-key': apiKey },
      });
    } catch (err) {
      this.logger.error(`HikerAPI so'rovida tarmoq xatosi: ${err}`);
      throw new Error('HikerAPI bilan bog\'lanishda xatolik yuz berdi');
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `HikerAPI xato qaytardi: status=${response.status}, body=${errorBody}`,
      );

      if (response.status === 401) {
        throw new Error('HikerAPI token noto\'g\'ri yoki muddati o\'tgan');
      }
      if (response.status === 402) {
        throw new Error('HikerAPI balansda mablag\' yetarli emas');
      }
      if (response.status === 404) {
        throw new Error('Video topilmadi — link noto\'g\'ri yoki o\'chirilgan bo\'lishi mumkin');
      }
      throw new Error(`HikerAPI xato qaytardi: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      this.logger.error(`HikerAPI status="ok" emas: ${JSON.stringify(data)}`);
      throw new Error('HikerAPI noto\'g\'ri javob qaytardi');
    }

    const media = data.media_or_ad;

    if (!media) {
      throw new Error('HikerAPI javobida media_or_ad maydoni topilmadi');
    }

    const videoVersions = media.video_versions;

    if (!videoVersions || videoVersions.length === 0) {
      throw new Error('Bu post video emas yoki video versiyalari topilmadi');
    }

    const videoUrl = videoVersions[0].url;

    return {
      videoUrl,
      thumbnailUrl: media.image_versions2?.candidates?.[0]?.url ?? null,
      audioUrl: media.clips_metadata?.original_sound_info?.progressive_download_url ?? null,
      durationSeconds: media.video_duration ?? 0,
      caption: media.caption?.text ?? null,
      username: media.user?.username ?? null,
      width: media.original_width ?? videoVersions[0].width,
      height: media.original_height ?? videoVersions[0].height,
    };
  }
}
