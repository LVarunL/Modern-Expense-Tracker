const config = require("./app.json");

const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const androidClientIdBase = androidClientId.replace(".apps.googleusercontent.com", "");
const googleScheme = androidClientIdBase
  ? `com.googleusercontent.apps.${androidClientIdBase}`
  : null;

const existingScheme = config.expo.scheme;
const schemeList = new Set();

if (Array.isArray(existingScheme)) {
  existingScheme.forEach((scheme) => scheme && schemeList.add(scheme));
} else if (existingScheme) {
  schemeList.add(existingScheme);
}

if (googleScheme) {
  schemeList.add(googleScheme);
}

const schemes = Array.from(schemeList);

module.exports = {
  ...config,
  expo: {
    ...config.expo,
    scheme: schemes.length > 1 ? schemes : schemes[0],
  },
};
