import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProcessingService {
  private recentRequests = new Map<string, number>();
  private readonly DUPLICATE_WINDOW_MS = 5_000; // 5 soniya

  /**
   * Agar shu key (userId + link) so'nggi 5 soniya ichida
   * allaqachon so'ralgan bo'lsa, true qaytaradi (e'tiborsiz qoldirish kerak).
   */
  isDuplicate(userId: number, url: string): boolean {
    const key = `${userId}:${url}`;
    const lastRequestTime = this.recentRequests.get(key);
    const now = Date.now();

    if (lastRequestTime && now - lastRequestTime < this.DUPLICATE_WINDOW_MS) {
      return true;
    }

    this.recentRequests.set(key, now);
    this.cleanupOld(now);
    return false;
  }

  private cleanupOld(now: number): void {
    for (const [key, timestamp] of this.recentRequests.entries()) {
      if (now - timestamp > this.DUPLICATE_WINDOW_MS) {
        this.recentRequests.delete(key);
      }
    }
  }
}
