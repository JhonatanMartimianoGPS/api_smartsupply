import { HttpError } from './errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads the :id from the URL and ensures it is a valid UUID
export function readId(req) {
  const id = req.params.id;

  if (typeof id !== 'string' || !UUID.test(id)) {
    throw new HttpError('Invalid ID', 400);
  }

  return id;
}
