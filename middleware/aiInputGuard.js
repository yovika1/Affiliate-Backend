const MAX_MESSAGE_LENGTH = 500;
const MAX_SESSION_LENGTH = 120;
const MIN_MESSAGE_LENGTH = 2;

const hasTooManyRepeatedCharacters = (value = "") =>
  /(.)\1{19,}/.test(value);

const hasMostlyNonWordContent = (value = "") => {
  const compact = String(value).replace(/\s+/g, "");
  if (!compact) return true;

  const wordChars = compact.match(/[a-zA-Z0-9]/g)?.length || 0;
  return wordChars / compact.length < 0.25;
};

export const aiInputGuard = (req, res, next) => {
  const { sessionId, message } = req.body || {};

  if (typeof sessionId !== "string" || typeof message !== "string") {
    return res.status(400).json({
      error: "sessionId and message must be strings",
    });
  }

  const normalizedSessionId = sessionId.trim();
  const normalizedMessage = message.trim();

  if (
    normalizedSessionId.length < 3 ||
    normalizedSessionId.length > MAX_SESSION_LENGTH ||
    !/^[a-zA-Z0-9:_-]+$/.test(normalizedSessionId)
  ) {
    return res.status(400).json({
      error: "Invalid sessionId format",
    });
  }

  if (
    normalizedMessage.length < MIN_MESSAGE_LENGTH ||
    normalizedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      error: `message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`,
    });
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalizedMessage)) {
    return res.status(400).json({
      error: "message contains invalid control characters",
    });
  }

  if (hasTooManyRepeatedCharacters(normalizedMessage) || hasMostlyNonWordContent(normalizedMessage)) {
    return res.status(400).json({
      error: "message format is not supported",
    });
  }

  req.body.sessionId = normalizedSessionId;
  req.body.message = normalizedMessage;
  return next();
};

export default aiInputGuard;
