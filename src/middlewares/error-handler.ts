// Must have all 4 parameters, otherwise Express does not recognize it as an error handler
export function errorHandler(error, req, res, next) {
  // Errors we throw ourselves (HttpError)
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  // Duplicate unique value in the database (e.g. email already registered)
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Record already exists' });
  }

  // Foreign key points to a record that does not exist (e.g. unknown user_id)
  if (error.code === 'P2003') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
