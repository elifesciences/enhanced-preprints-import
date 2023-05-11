export type ImportMessage = {
  status: 'SUCCESS' | 'SKIPPED'
  message: string;
};

export class DocMapIndexUndefinedError extends Error {
  constructor() {
    super();
    this.name = 'DocMapIndexUndefinedError';
    this.message = 'Doc Map result is undefined';
  }
}
