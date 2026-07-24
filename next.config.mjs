import { wrapNextjsConfigWithBraintrust } from "braintrust/next";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default wrapNextjsConfigWithBraintrust(nextConfig);
