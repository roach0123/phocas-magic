# Publishing checklist (Chrome Web Store, Unlisted)

Everything in the package is ready. These steps need your Google account.

## One time

1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that should own the listing.
2. Accept the developer agreement and pay the one-time $5 registration fee.
3. Verify the contact email the console asks for.

## Each release

1. Build the upload file: `scripts/build.sh` creates `dist/phocas-magic-<version>.zip`.
2. In the developer console: **New item** (first time) or open the item and choose **Package > Upload new package** (updates), then upload the zip.
3. **Store listing** tab: paste the text from `store/LISTING.md`, and upload:
   - icon: `extension/icons/icon128.png`
   - screenshot: `store/private/screenshots/1-dashboard.png` only (1280x800, demo data)
   - skip the promo tiles (optional)
4. **Privacy practices** tab: paste the single purpose, the permission justifications, the remote code answer and the privacy policy URL from `store/LISTING.md`. Tick the three certifications.
5. **Distribution** tab: Visibility **Unlisted**.
6. **Submit for review.** A first review usually takes a few days. Updates are usually quicker.

## After approval

- The console shows the store link. Share that link: people click **Add to Chrome** and get updates automatically.
- To update: raise `version` in `extension/manifest.json`, run `scripts/build.sh`, upload the new zip and submit.
- Anyone who loaded the unpacked version (Developer mode) should remove it after installing from the store, so they don't run both.

## Company-wide install (optional)

IT can push it to every managed Chrome with the `ExtensionInstallForcelist` policy (Intune, Google Admin or Group Policy), using the item ID shown in the console:
`<item-id>;https://clients2.google.com/service/update2/crx`
