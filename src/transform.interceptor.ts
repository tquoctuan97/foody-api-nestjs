import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
  // if response is array, wrap it in data object
  // if response is object, do not wrap it
  intercept(context, next) {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return {
            data,
            // metadata return pageSize of data, currentPage of data, totalPages of data, totalCount of data, hasNextPage of data
            metadata: {
              pageSize: data.length,
              currentPage: 1,
              totalPages: 1,
              totalCount: data.length,
              hasNextPage: false,
            },
          };
        }
        return data;
      }),
    );
  }
}
