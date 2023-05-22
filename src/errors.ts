/* eslint-disable max-classes-per-file */

export class NonRetryableError extends Error {
  constructor(message: string) {
    super();
    this.name = 'NonRetryableError';
    this.message = message;
  }
}
