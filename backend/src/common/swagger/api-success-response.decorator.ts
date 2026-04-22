import { HttpStatus, Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export class SwaggerSuccessEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;
}

interface ApiSuccessResponseOptions {
  status?: number;
  description?: string;
  type: Type<unknown>;
  isArray?: boolean;
  nullable?: boolean;
}

function buildDataSchema(
  type: Type<unknown>,
  isArray: boolean,
  nullable: boolean,
): Record<string, unknown> {
  if (isArray) {
    return {
      type: 'array',
      items: { $ref: getSchemaPath(type) },
    };
  }

  if (nullable) {
    return {
      allOf: [{ $ref: getSchemaPath(type) }],
      nullable: true,
    };
  }

  return { $ref: getSchemaPath(type) };
}

export function ApiSuccessResponse({
  status = HttpStatus.OK,
  description,
  type,
  isArray = false,
  nullable = false,
}: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(SwaggerSuccessEnvelopeDto, type),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SwaggerSuccessEnvelopeDto) },
          {
            type: 'object',
            properties: {
              data: buildDataSchema(type, isArray, nullable),
            },
            required: ['data'],
          },
        ],
      },
    }),
  );
}
