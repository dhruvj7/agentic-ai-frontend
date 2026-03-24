export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1/public',
  google: {
    clientId: '779148654846-mh4kcclmjl4a3g28p38mqajgld525hua.apps.googleusercontent.com',
    redirectUri: 'http://localhost:4200/auth/callback',
    scope: 'openid email profile',
  },
};