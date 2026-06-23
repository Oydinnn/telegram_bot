import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProcessingService {
  private processingUsers = new Map<number, NodeJS.Timeout>();
  private readonly TIMEOUT_MS = 60_000; // 60 soniyadan keyin avtomatik bo'shatish

  has(userId: number): boolean {
    return this.processingUsers.has(userId);
  }

  add(userId: number): void {
    this.clearExisting(userId);

    const timer = setTimeout(() => {
      this.processingUsers.delete(userId);
    }, this.TIMEOUT_MS);

    this.processingUsers.set(userId, timer);
  }

  delete(userId: number): void {
    this.clearExisting(userId);
    this.processingUsers.delete(userId);
  }

  private clearExisting(userId: number): void {
    const existingTimer = this.processingUsers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
  }
}
