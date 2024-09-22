import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class DecodeUriPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return decodeURI(value);
    }
    return value; // Return the value as is if it's not a string
  }
}
