function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get appOrigin() {
    return process.env.APP_ORIGIN || "http://localhost:3000";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
