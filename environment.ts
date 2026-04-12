export const environment = {
  production: false,
  apiBaseUrl: 'https://healthcarecompanion.up.railway.app/api/v1/public',
  google: {
    clientId: '779148654846-mh4kcclmjl4a3g28p38mqajgld525hua.apps.googleusercontent.com',
    redirectUri: 'https://care-navigator.netlify.app/auth/callback',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
  },
};