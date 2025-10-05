function handleError(res, error, action, jsonResponse = true) {
  console.error(`Erro ao ${action}:`, error);
  const msg = error.message || `Erro ao ${action}`;
  if (jsonResponse) res.status(500).json({ error: msg });
  else res.status(500).send(msg);
}

module.exports = handleError;