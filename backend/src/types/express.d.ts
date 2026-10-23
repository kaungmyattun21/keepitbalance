// Adds fields our middleware sets on the Express request.
export {};

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth. Read it with getUserId(req) in controllers.
      userId?: string;
    }
  }
}
