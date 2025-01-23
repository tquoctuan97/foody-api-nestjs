import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: false, versionKey: false })
export class AuditLog extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Retailer' })
  retailerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  modifiedBy: Types.ObjectId;

  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, default: Date.now() })
  modifiedDate: Date;

  @Prop({ type: Object })
  oldData: object;

  @Prop({ type: Object })
  newData: object;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
