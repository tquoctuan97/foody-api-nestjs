import { customAlphabet } from 'nanoid';

export const generateRandomSlug = (length = 5) => {
  return customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    length,
  )();
};
