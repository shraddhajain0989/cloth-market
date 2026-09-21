export function ok(res, data, message = "OK") {
  return res.json({ success: true, message, data });
}

export function fail(res, status, message, details) {
  return res.status(status).json({ success: false, message, details });
}
