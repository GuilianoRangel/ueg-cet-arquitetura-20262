import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorDetail } from '@repo/utils';

export class BusinessException extends HttpException {
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    fieldOrDetails?: string | ApiErrorDetail[],
  ) {
    let resolvedDetails: ApiErrorDetail[] | undefined;
    if (typeof fieldOrDetails === 'string' && fieldOrDetails.trim() !== '') {
      resolvedDetails = [{ field: fieldOrDetails, message }];
    } else if (Array.isArray(fieldOrDetails) && fieldOrDetails.length > 0) {
      resolvedDetails = fieldOrDetails;
    }

    super(
      {
        statusCode: status,
        message,
        error: code,
        ...(resolvedDetails ? { details: resolvedDetails } : {}),
      },
      status,
    );
    this.code = code;
    this.details = resolvedDetails;
  }
}
