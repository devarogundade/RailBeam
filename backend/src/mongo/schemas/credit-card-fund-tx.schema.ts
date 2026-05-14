import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CreditCardFundTxDocument = HydratedDocument<CreditCardFundTx>;

/** Records native transfers consumed to credit a virtual card (prevents tx replay). */
@Schema({ collection: 'credit_card_fund_txs', timestamps: true })
export class CreditCardFundTx {
  @Prop({ required: true, unique: true, lowercase: true })
  txHash!: string;

  @Prop({ required: true, lowercase: true })
  walletAddress!: string;
}

export const CreditCardFundTxSchema =
  SchemaFactory.createForClass(CreditCardFundTx);
