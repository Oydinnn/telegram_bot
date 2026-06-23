import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProcessingService {
  private processingUsers = new Set<number>();

  has(userId: number): boolean {
    return this.processingUsers.has(userId);
  }

  add(userId: number): void {
    this.processingUsers.add(userId);
  }

  delete(userId: number): void {
    this.processingUsers.delete(userId);
  }
}
