const security = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const cors = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
];

module.exports = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: '/:path*', headers: security },
      { source: '/api/v1/:path*', headers: cors },
    ];
  },
};
