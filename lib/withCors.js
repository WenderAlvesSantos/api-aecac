import { corsHeaders, handleOptions } from '../middleware/cors'

export function withCors(handler) {
  return async (req, res) => {
    // Handle CORS preflight
    if (handleOptions(req, res)) {
      return
    }

    // Set CORS headers
    corsHeaders(res)

    return handler(req, res)
  }
}

