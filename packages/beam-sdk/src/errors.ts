export class BeamApiError extends Error {
  readonly status: number;

  readonly bodyText: string;

  constructor(
    message: string,
    opts: { status: number; bodyText: string },
  ) {
    super(message);
    this.name = "BeamApiError";
    this.status = opts.status;
    this.bodyText = opts.bodyText;
  }
}
