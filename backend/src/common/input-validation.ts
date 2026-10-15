import { BadRequestException, ValidationPipe } from '@nestjs/common';

// Return only validation messages, never submitted values, passwords, or DTO objects.
export function inputValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
    exceptionFactory: errors => {
      const fieldErrors: Record<string, string> = {};
      for (const error of errors) {
        const messages = Object.values(error.constraints || {});
        fieldErrors[error.property] = messages.join(' ') || 'Check this field.';
      }
      return new BadRequestException({
        statusCode: 400,
        message: 'Please correct the highlighted fields.',
        fieldErrors,
      });
    },
  });
}
