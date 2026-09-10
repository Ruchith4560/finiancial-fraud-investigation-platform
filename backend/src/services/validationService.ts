import { IBatchError } from '../models/IngestionBatch';
import { TransactionType } from '../models/Transaction';

export interface RawTransactionRow {
  transaction_id?: string;
  sender_account_id?: string;
  receiver_account_id?: string;
  amount?: string | number;
  timestamp?: string;
  transaction_type?: string;
  device_id?: string;
  ip_address?: string;
  [key: string]: any;
}

export interface ValidatedTransaction {
  transactionId: string;
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  currency: string;
  timestamp: Date;
  transactionType: TransactionType;
  deviceId?: string;
  ipAddress?: string;
}

export class ValidationService {
  private static VALID_TRANSACTION_TYPES = new Set(['TRANSFER', 'PAYMENT', 'CASH_OUT', 'DEPOSIT']);

  static validateRow(
    row: RawTransactionRow,
    rowIndex: number,
    seenIdsInBatch: Set<string>
  ): { valid: boolean; data?: ValidatedTransaction; errors: IBatchError[] } {
    const errors: IBatchError[] = [];

    // 1. Transaction ID
    const txId = (row.transaction_id || row.transactionId || '').toString().trim();
    if (!txId) {
      errors.push({
        row: rowIndex,
        column: 'transaction_id',
        message: 'Transaction ID is required and cannot be empty',
        value: row.transaction_id,
      });
    } else if (seenIdsInBatch.has(txId)) {
      errors.push({
        row: rowIndex,
        column: 'transaction_id',
        message: `Duplicate transaction ID '${txId}' detected within the same batch`,
        value: txId,
      });
    }

    // 2. Sender Account ID
    const sender = (row.sender_account_id || row.senderAccountId || '').toString().trim();
    if (!sender) {
      errors.push({
        row: rowIndex,
        column: 'sender_account_id',
        message: 'Sender Account ID is required',
        value: row.sender_account_id,
      });
    }

    // 3. Receiver Account ID
    const receiver = (row.receiver_account_id || row.receiverAccountId || '').toString().trim();
    if (!receiver) {
      errors.push({
        row: rowIndex,
        column: 'receiver_account_id',
        message: 'Receiver Account ID is required',
        value: row.receiver_account_id,
      });
    } else if (sender && sender === receiver) {
      errors.push({
        row: rowIndex,
        column: 'receiver_account_id',
        message: 'Sender and Receiver Account IDs cannot be identical (self-transfers not permitted)',
        value: receiver,
      });
    }

    // 4. Amount Validation
    const rawAmount = row.amount;
    const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
    if (isNaN(amount) || amount <= 0) {
      errors.push({
        row: rowIndex,
        column: 'amount',
        message: 'Amount must be a positive numeric value greater than zero',
        value: row.amount,
      });
    }

    // 5. Timestamp Validation
    const rawTimestamp = row.timestamp;
    const timestamp = new Date(rawTimestamp || '');
    if (!rawTimestamp || isNaN(timestamp.getTime())) {
      errors.push({
        row: rowIndex,
        column: 'timestamp',
        message: 'Timestamp must be a valid ISO 8601 or standard date format',
        value: row.timestamp,
      });
    }

    // 6. Transaction Type Validation
    const rawType = (row.transaction_type || row.transactionType || 'TRANSFER').toString().toUpperCase().trim();
    if (!this.VALID_TRANSACTION_TYPES.has(rawType)) {
      errors.push({
        row: rowIndex,
        column: 'transaction_type',
        message: `Transaction type must be one of [${Array.from(this.VALID_TRANSACTION_TYPES).join(', ')}]`,
        value: row.transaction_type,
      });
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    seenIdsInBatch.add(txId);

    return {
      valid: true,
      data: {
        transactionId: txId,
        senderAccountId: sender,
        receiverAccountId: receiver,
        amount: Math.round(amount * 100) / 100,
        currency: 'USD',
        timestamp,
        transactionType: rawType as TransactionType,
        deviceId: (row.device_id || row.deviceId || '').toString().trim() || undefined,
        ipAddress: (row.ip_address || row.ipAddress || '').toString().trim() || undefined,
      },
      errors: [],
    };
  }
}
