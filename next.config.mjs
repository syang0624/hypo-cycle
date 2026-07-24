import { wrapNextjsConfigWithBraintrust } from "braintrust/next";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default process.env.BRAINTRUST_API_KEY
  ? wrapNextjsConfigWithBraintrust(nextConfig)
  : nextConfig;
