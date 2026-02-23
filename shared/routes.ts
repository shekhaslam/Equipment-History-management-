
import { z } from 'zod';
import { insertEquipmentSchema, insertRepairSchema, equipment, repairs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  equipment: {
    list: {
      method: 'GET' as const,
      path: '/api/equipment',
      responses: {
        200: z.array(z.custom<typeof equipment.$inferSelect & { repairs: typeof repairs.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/equipment/:id',
      responses: {
        200: z.custom<typeof equipment.$inferSelect & { repairs: typeof repairs.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/equipment',
      input: insertEquipmentSchema.extend({
        repairs: z.array(insertRepairSchema.omit({ equipmentId: true })).optional(),
      }),
      responses: {
        201: z.custom<typeof equipment.$inferSelect & { repairs: typeof repairs.$inferSelect[] }>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/equipment/:id',
      input: insertEquipmentSchema.partial().extend({
        repairs: z.array(insertRepairSchema.omit({ equipmentId: true }).extend({ id: z.number().optional() })).optional(),
      }),
      responses: {
        200: z.custom<typeof equipment.$inferSelect & { repairs: typeof repairs.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/equipment/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
