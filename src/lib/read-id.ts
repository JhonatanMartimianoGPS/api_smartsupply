import { HttpError } from './errors';

// Reads the :id from the URL and ensures it is a positive integer
export function readId(req) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError('Invalid ID', 400);
  }

  return id;
}
