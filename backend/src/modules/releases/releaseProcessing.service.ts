import { pool } from '../../db/pool';

export class ReleaseProcessingService {
  private readonly scheduled = new Map<string, NodeJS.Timeout>();

  public enqueue(params: { releaseId: string }): void {
    if (this.scheduled.has(params.releaseId)) return;

    const delayMs = 5000 + Math.floor(Math.random() * 5001);

    const timer = setTimeout(() => {
      void this.processOnce({ releaseId: params.releaseId }).catch(() => {});
    }, delayMs);

    timer.unref?.();

    this.scheduled.set(params.releaseId, timer);
  }

  private async processOnce(params: { releaseId: string }): Promise<void> {
    try {
      await pool.query(
        `
        UPDATE releases
        SET status = 'PENDING_REVIEW'
        WHERE id = $1
          AND status = 'PROCESSING'
        `,
        [params.releaseId]
      );
    } finally {
      const timer = this.scheduled.get(params.releaseId);
      if (timer) {
        clearTimeout(timer);
      }
      this.scheduled.delete(params.releaseId);
    }
  }
}

export const releaseProcessingService = new ReleaseProcessingService();
