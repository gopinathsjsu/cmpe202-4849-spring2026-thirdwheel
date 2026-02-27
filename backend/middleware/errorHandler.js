function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    const status = err.statusCode || err.status || 500;
    if (status >= 500) {
        console.error('Unhandled error:', err);
    }
    res.status(status).json({
        error: err.message || 'Something went wrong.',
        ...(err.details ? { details: err.details } : {}),
    });
}

module.exports = errorHandler;
