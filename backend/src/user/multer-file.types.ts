/**
 * Subset of Express.Multer.File used for OG uploads (memory or disk temp).
 * Avoids depending on @types/multer at compile time.
 */
export type MulterIncomingFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};
