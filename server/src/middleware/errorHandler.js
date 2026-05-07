export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      details: { path: req.path },
    },
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';
  const details = err.details || null;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}
