/* eslint-disable max-classes-per-file */

export class NonRetryableError extends Error {
  constructor(message: string) {
    super();
    this.name = 'NonRetryableError';
    this.message = message;
  }
}

export class DocMapError extends Error {
  constructor(message: string = 'There was a problem with the Doc Map') {
    super();
    this.name = 'DocMapError';
    this.message = message;
  }
}
